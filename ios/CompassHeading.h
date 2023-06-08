
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNCompassHeadingSpec.h"

@interface CompassHeading : NSObject <NativeCompassHeadingSpec>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTEventDispatcher.h>
#import <Corelocation/CoreLocation.h>

@interface CompassHeading : RCTEventEmitter <RCTBridgeModule, CLLocationManagerDelegate>
#endif

@end
