// ios/CompassHeading.mm
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(CompassHeading, RCTEventEmitter)

RCT_EXTERN_METHOD(start:(double)degreeUpdateRate)
RCT_EXTERN_METHOD(stop)

@end