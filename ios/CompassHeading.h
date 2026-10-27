#import <CompassHeadingSpec/CompassHeadingSpec.h>
#import <CoreLocation/CoreLocation.h>
#import <React/RCTInvalidating.h>

@interface CompassHeading : NativeCompassHeadingSpecBase <NativeCompassHeadingSpec, CLLocationManagerDelegate, RCTInvalidating>

@end
