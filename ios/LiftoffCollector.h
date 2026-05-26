#import <Foundation/Foundation.h>

@interface LiftoffCollector : NSObject
+ (double)mark:(NSString *)name;
+ (NSArray *)checkpoints;
+ (void)clear;
+ (double)anchorMonotonicMs;
+ (double)anchorWallMs;
@end
