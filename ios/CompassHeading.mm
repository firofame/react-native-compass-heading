#import "CompassHeading.h"
#import <React/RCTLog.h>
#import <UIKit/UIKit.h>
#include <cmath>

@implementation CompassHeading {
  CLLocationManager *_locationManager;
  NSNumber *_lastHeading;
  double _updateRate;
  BOOL _updating;
}

- (void)start:(double)degreeUpdateRate
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

    self->_updateRate = degreeUpdateRate;
    self->_lastHeading = nil;
    // Filter after orientation adjustment, including orientation-only updates.
    self->_locationManager.headingFilter = kCLHeadingFilterNone;
    if (!self->_updating) {
      [[NSNotificationCenter defaultCenter] addObserver:self
                                               selector:@selector(orientationDidChange:)
                                                   name:UIDeviceOrientationDidChangeNotification
                                                 object:nil];
      [[UIDevice currentDevice] beginGeneratingDeviceOrientationNotifications];
    }
    self->_updating = YES;
    [self->_locationManager startUpdatingHeading];
    resolve(@YES);
  });
}

- (void)stop
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self stopUpdating];
  });
}

- (void)stopUpdating
{
  [_locationManager stopUpdatingHeading];
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:UIDeviceOrientationDidChangeNotification
                                                object:nil];
  if (_updating) {
    [[UIDevice currentDevice] endGeneratingDeviceOrientationNotifications];
  }
  _updating = NO;
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

  double adjustedHeading = heading.magneticHeading;
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
  RCTLogError(@"CompassHeading location manager failed: %@", error.localizedDescription);
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
