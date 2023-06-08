#import "CompassHeading.h"

#define kHeadingUpdated @"HeadingUpdated"

@implementation CompassHeading{
    CLLocationManager *locationManager;
    BOOL isObserving;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

- (instancetype)init {
    if (self = [super init]) {
        isObserving = NO;
        
        if ([CLLocationManager headingAvailable]) {
            locationManager = [[CLLocationManager alloc] init];
            locationManager.delegate = self;
        }
        else {
            locationManager = nil;
            //NSLog(@"Heading not available");
        }
    }

    return self;
}

#pragma mark - RCTEventEmitter

- (NSArray<NSString *> *)supportedEvents {
    return @[kHeadingUpdated];
}

- (void)startObserving {
    isObserving = YES;
}

- (void)stopObserving {
    isObserving = NO;
}

#pragma mark - CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager didUpdateHeading:(CLHeading *)newHeading {
    if (newHeading.headingAccuracy < 0) {
        return;
    }
    
    dispatch_sync(dispatch_get_main_queue(), ^{
        NSInteger heading = newHeading.trueHeading;
        
        // if the device supports UI rotation, we need to adjust
        // our heading value since it will default to
        // top of the device in portrait
        UIInterfaceOrientation interfaceOrientation = [[UIApplication sharedApplication] statusBarOrientation];
        
        if(interfaceOrientation == UIInterfaceOrientationLandscapeLeft){
            heading = (heading + 270) % 360;
        }
        else if(interfaceOrientation == UIInterfaceOrientationLandscapeRight){
            heading = (heading + 90) % 360;
        }
        else if(interfaceOrientation == UIInterfaceOrientationPortraitUpsideDown){
            heading = (heading + 180) % 360;
        }
        
        if(isObserving){
            [self sendEventWithName:kHeadingUpdated body:@{
                @"heading": @(heading),
                @"accuracy": @(newHeading.headingAccuracy)
            }];
        }
    });
}

- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status {
    //NSLog(@"AuthoriationStatus changed: %i", status);
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
    //NSLog(@"Location manager failed: %@", error);
}

- (BOOL)locationManagerShouldDisplayHeadingCalibration:(CLLocationManager *)manager
{
    // return false;
    CLLocationDirection accuracy = [[manager heading] headingAccuracy];
    return accuracy <= 0.0f || (accuracy > locationManager.headingFilter);
}

#pragma mark - React

RCT_EXPORT_METHOD(start: (NSInteger) headingFilter
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    @try{
        locationManager.headingFilter = headingFilter;
        [locationManager startUpdatingHeading];
        resolve(@(YES));
    }
    @catch (NSException *exception) {
        reject(@"failed_start", exception.name, nil);
    }
}

RCT_EXPORT_METHOD(stop) {
    [locationManager stopUpdatingHeading];
}

RCT_EXPORT_METHOD(hasCompass:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
    BOOL result = locationManager != nil ? YES : NO;
    resolve(@(result));
}

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeCompassHeadingSpecJSI>(params);
}
#endif

@end
