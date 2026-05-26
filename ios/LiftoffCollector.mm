#import "LiftoffCollector.h"
#import <mach/mach_time.h>

static NSMutableArray *_checkpoints;
static dispatch_queue_t _queue;
static double _anchorMonotonicMs;
static double _anchorWallMs;

static double nowMs(void) {
    static mach_timebase_info_data_t tb;
    static dispatch_once_t once;
    dispatch_once(&once, ^{ mach_timebase_info(&tb); });
    return (double)mach_absolute_time() * tb.numer / tb.denom / 1e6;
}

@implementation LiftoffCollector

+ (void)initialize {
    if (self == [LiftoffCollector class]) {
        _checkpoints = [NSMutableArray new];
        _queue = dispatch_queue_create("com.liftoff.collector", DISPATCH_QUEUE_SERIAL);
        _anchorMonotonicMs = nowMs();
        _anchorWallMs = [[NSDate date] timeIntervalSince1970] * 1000.0;
    }
}

+ (void)mark:(NSString *)name {
    double ts = nowMs();
    dispatch_sync(_queue, ^{
        [_checkpoints addObject:@{ @"name": name, @"timestamp": @(ts) }];
    });
}

+ (NSArray *)checkpoints {
    __block NSArray *snap;
    dispatch_sync(_queue, ^{ snap = [_checkpoints copy]; });
    return snap;
}

+ (void)clear {
    dispatch_async(_queue, ^{ [_checkpoints removeAllObjects]; });
}

+ (double)anchorMonotonicMs { return _anchorMonotonicMs; }
+ (double)anchorWallMs      { return _anchorWallMs; }

@end
