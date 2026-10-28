#import "CompassHeading.h"
#import <React/RCTLog.h>
#import <UIKit/UIKit.h>
#include <cmath>

@implementation CompassHeading {
  CLLocationManager *_locationManager;
  NSNumber *_lastHeading;
  double _updateRate;
  BOOL _updating;
  BOOL _observingOrientation;
  BOOL _useTrueNorth;
  BOOL _hasLocation;
  BOOL _receivedTrueHeading;
  NSUInteger _generation;
  RCTPromiseResolveBlock _startResolve;
  RCTPromiseRejectBlock _startReject;
}

- (void)start:(double)degreeUpdateRate
useTrueNorth:(BOOL)useTrueNorth
     resolve:(RCTPromiseResolveBlock)resolve
      reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!std::isfinite(degreeUpdateRate) || degreeUpdateRate < 0) {
      reject(@"invalid_update_rate", @"degreeUpdateRate must be a finite, non-negative number", nil);
      return;
    }
    if (![CLLocationManager headingAvailable]) {
      reject(@"not_available", @"This device does not have a compass", nil);
      return;
    }
    if (!self->_locationManager) {
      self->_locationManager = [CLLocationManager new];
      self->_locationManager.delegate = self;
    }
    if (useTrueNorth) {
      NSString *usage = [NSBundle.mainBundle objectForInfoDictionaryKey:@"NSLocationWhenInUseUsageDescription"];
      if (![usage isKindOfClass:NSString.class] || usage.length == 0) {
        reject(@"missing_permission_config", @"Add NSLocationWhenInUseUsageDescription to Info.plist for true north", nil);
        return;
      }
      if (![CLLocationManager locationServicesEnabled]) {
        reject(@"location_disabled", @"Enable location services to use true north", nil);
        return;
      }
      CLAuthorizationStatus status = self->_locationManager.authorizationStatus;
      if (status == kCLAuthorizationStatusDenied || status == kCLAuthorizationStatusRestricted) {
        reject(@"permission_denied", @"Location permission is required for true north", nil);
        return;
      }
    }

    [self stopUpdating];
    self->_updateRate = degreeUpdateRate;
    self->_lastHeading = nil;
    self->_useTrueNorth = useTrueNorth;
    self->_receivedTrueHeading = NO;
    self->_startResolve = resolve;
    self->_startReject = reject;
    self->_updating = YES;
    if (useTrueNorth &&
        self->_locationManager.authorizationStatus == kCLAuthorizationStatusNotDetermined) {
      [self->_locationManager requestWhenInUseAuthorization];
    } else {
      [self beginUpdates];
    }
  });
}

- (void)beginUpdates
{
  // Filter after orientation adjustment, including orientation-only updates.
  _locationManager.headingFilter = kCLHeadingFilterNone;
  if (!_observingOrientation) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(orientationDidChange:)
                                                 name:UIDeviceOrientationDidChangeNotification
                                               object:nil];
    [[UIDevice currentDevice] beginGeneratingDeviceOrientationNotifications];
    _observingOrientation = YES;
  }
  if (_useTrueNorth) {
    _locationManager.desiredAccuracy = kCLLocationAccuracyKilometer;
    _locationManager.distanceFilter = 1000;
    [_locationManager startUpdatingLocation];
    NSUInteger generation = _generation;
    __weak CompassHeading *weakSelf = self;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 30 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
      CompassHeading *strongSelf = weakSelf;
      if (strongSelf && strongSelf->_updating &&
          strongSelf->_generation == generation && !strongSelf->_receivedTrueHeading) {
        [strongSelf failWithCode:@"location_unavailable"
                        message:@"Could not obtain a true-north reading within 30 seconds"];
      }
    });
  }
  [_locationManager startUpdatingHeading];
  RCTPromiseResolveBlock resolve = _startResolve;
  _startResolve = nil;
  _startReject = nil;
  if (resolve) {
    resolve(@YES);
  }
}

- (void)stop
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self stopUpdating];
  });
}

- (void)stopUpdating
{
  ++_generation;
  [_locationManager stopUpdatingHeading];
  [_locationManager stopUpdatingLocation];
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:UIDeviceOrientationDidChangeNotification
                                                object:nil];
  if (_observingOrientation) {
    [[UIDevice currentDevice] endGeneratingDeviceOrientationNotifications];
  }
  _observingOrientation = NO;
  _updating = NO;
  _hasLocation = NO;
  RCTPromiseRejectBlock reject = _startReject;
  _startResolve = nil;
  _startReject = nil;
  if (reject) {
    reject(@"start_cancelled", @"Compass start was cancelled", nil);
  }
}

- (void)failWithCode:(NSString *)code message:(NSString *)message
{
  RCTPromiseRejectBlock reject = _startReject;
  _startResolve = nil;
  _startReject = nil;
  [self stopUpdating];
  if (reject) {
    reject(code, message, nil);
  } else {
    [self emitOnError:@{@"code": code, @"message": message}];
  }
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager
{
  if (!_updating || !_useTrueNorth) {
    return;
  }
  switch (manager.authorizationStatus) {
    case kCLAuthorizationStatusAuthorizedAlways:
    case kCLAuthorizationStatusAuthorizedWhenInUse:
      if (_startResolve) {
        [self beginUpdates];
      }
      break;
    case kCLAuthorizationStatusDenied:
    case kCLAuthorizationStatusRestricted:
      [self failWithCode:@"permission_denied"
                message:@"Location permission is required for true north"];
      break;
    default:
      break;
  }
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  CLLocation *location = locations.lastObject;
  if (!_updating || !_useTrueNorth || location == nil ||
      location.horizontalAccuracy < 0 || std::fabs(location.timestamp.timeIntervalSinceNow) > 300) {
    return;
  }
  _hasLocation = YES;
  [self sendHeading:manager.heading];
}

- (void)hasCompass:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve(@([CLLocationManager headingAvailable]));
}

- (void)locationManager:(CLLocationManager *)manager didUpdateHeading:(CLHeading *)newHeading
{
  [self sendHeading:newHeading];
}

- (void)sendHeading:(CLHeading *)heading
{
  if (!_updating || heading == nil || heading.headingAccuracy < 0) {
    return;
  }

  if (_useTrueNorth && (!_hasLocation || heading.trueHeading < 0)) {
    return;
  }
  if (_useTrueNorth) {
    _receivedTrueHeading = YES;
  }
  double adjustedHeading = _useTrueNorth ? heading.trueHeading : heading.magneticHeading;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class] ||
        scene.activationState != UISceneActivationStateForegroundActive) {
      continue;
    }
    switch (((UIWindowScene *)scene).interfaceOrientation) {
      case UIInterfaceOrientationPortraitUpsideDown:
        adjustedHeading += 180;
        break;
      case UIInterfaceOrientationLandscapeLeft:
        adjustedHeading -= 90;
        break;
      case UIInterfaceOrientationLandscapeRight:
        adjustedHeading += 90;
        break;
      default:
        break;
    }
    break;
  }
  adjustedHeading = std::fmod(adjustedHeading + 360, 360);
  if (_lastHeading != nil && _updateRate > 0) {
    double difference = std::fabs(adjustedHeading - _lastHeading.doubleValue);
    if (std::fmin(difference, 360 - difference) <= _updateRate) {
      return;
    }
  }
  _lastHeading = @(adjustedHeading);
  [self emitOnHeadingUpdated:@{
    @"heading": @(adjustedHeading),
    @"accuracy": @(heading.headingAccuracy)
  }];
}

- (void)orientationDidChange:(NSNotification *)notification
{
  [self sendHeading:_locationManager.heading];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
  if (!_updating) {
    return;
  }
  if (_useTrueNorth) {
    if ([error.domain isEqualToString:kCLErrorDomain] && error.code == kCLErrorLocationUnknown) {
      // Core Location retries transient failures; the initial-reading timeout still applies.
      RCTLogWarn(@"CompassHeading waiting for location: %@", error.localizedDescription);
      return;
    }
    NSString *code = ([error.domain isEqualToString:kCLErrorDomain] && error.code == kCLErrorDenied)
      ? @"permission_denied" : @"location_unavailable";
    [self failWithCode:code message:error.localizedDescription];
  } else {
    [self emitOnError:@{@"code": @"heading_unavailable", @"message": error.localizedDescription}];
  }
}

- (void)invalidate
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self stopUpdating];
    self->_locationManager.delegate = nil;
    self->_locationManager = nil;
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCompassHeadingSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"CompassHeading";
}

@end
