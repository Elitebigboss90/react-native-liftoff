#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <LiftoffSpec/LiftoffSpec.h>
@interface Liftoff : NativeLiftoffSpecBase <NativeLiftoffSpec>
#else
@interface Liftoff : NSObject <RCTBridgeModule>
#endif

@end
