#import "Liftoff.h"
#import "LiftoffCollector.h"

@implementation Liftoff

#ifdef RCT_NEW_ARCH_ENABLED

- (void)mark:(NSString *)name   { [LiftoffCollector mark:name]; }
- (NSArray *)getCheckpoints     { return [LiftoffCollector checkpoints]; }
- (void)clear                   { [LiftoffCollector clear]; }

- (NSDictionary *)getAnchor {
    return @{
        @"monotonicMs": @([LiftoffCollector anchorMonotonicMs]),
        @"wallMs":      @([LiftoffCollector anchorWallMs]),
    };
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeLiftoffSpecJSI>(params);
}

+ (NSString *)moduleName { return @"Liftoff"; }

#else

RCT_EXPORT_MODULE(Liftoff)

RCT_EXPORT_METHOD(mark:(NSString *)name)               { [LiftoffCollector mark:name]; }
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getCheckpoints) { return [LiftoffCollector checkpoints]; }
RCT_EXPORT_METHOD(clear)                               { [LiftoffCollector clear]; }

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getAnchor) {
    return @{
        @"monotonicMs": @([LiftoffCollector anchorMonotonicMs]),
        @"wallMs":      @([LiftoffCollector anchorWallMs]),
    };
}

#endif

@end
