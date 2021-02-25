#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTEventDispatcher.h>
#import <Corelocation/CoreLocation.h>

@interface CompassHeading : RCTEventEmitter <RCTBridgeModule, CLLocationManagerDelegate>

@end
