#import "CompassHeading.h"
#import <React/RCTEventDispatcher.h>
#import <Corelocation/CoreLocation.h>

#define kHeadingUpdated @"HeadingUpdated"

@interface CompassHeading() <CLLocationManagerDelegate>
@property (strong, nonatomic) CLLocationManager *locationManager;
@end

@implementation CompassHeading

- (instancetype)init {
    if (self = [super init]) {
        if ([CLLocationManager headingAvailable]) {
            self.locationManager = [[CLLocationManager alloc] init];
            self.locationManager.delegate = self;
        }
        else {
            self.locationManager = nil;
            //NSLog(@"Heading not available");
        }
    }

    return self;
}

#pragma mark - RCTEventEmitter

- (NSArray<NSString *> *)supportedEvents {
    return @[kHeadingUpdated];
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
        
        [self sendEventWithName:kHeadingUpdated body:@(heading)];
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
    //CLLocationDirection accuracy = [[manager heading] headingAccuracy];
    return false; //accuracy <= 0.0f || accuracy > 10.0f;
}

#pragma mark - React

RCT_EXPORT_METHOD(start: (NSInteger) headingFilter
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    @try{
        self.locationManager.headingFilter = headingFilter;
        [self.locationManager startUpdatingHeading];
        resolve(@(YES));
    }
    @catch (NSException *exception) {
        reject(@"failed_start", exception.name, nil);
    }
}

RCT_EXPORT_METHOD(stop) {
    [self.locationManager stopUpdatingHeading];
}

RCT_EXPORT_METHOD(hasCompass:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
    BOOL result = self.locationManager != nil ? YES : NO;
    resolve(@(result));
}

RCT_EXPORT_MODULE()
    
+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

@end
