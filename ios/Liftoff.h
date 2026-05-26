#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <LiftoffSpec/LiftoffSpec.h>
@interface Liftoff : RCTEventEmitter <NativeLiftoffSpec>
#else
@interface Liftoff : RCTEventEmitter
#endif

@end
