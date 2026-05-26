package com.liftoff

import android.os.SystemClock

object LiftoffCollector {
  val anchorMonotonicMs: Double = SystemClock.elapsedRealtime().toDouble()
  val anchorWallMs: Double = System.currentTimeMillis().toDouble()

  private val list = mutableListOf<Map<String, Any>>()

  @Synchronized fun mark(name: String): Double {
    val ts = SystemClock.elapsedRealtime().toDouble()
    list.add(mapOf("name" to name, "timestamp" to ts))
    return ts
  }

  @Synchronized fun checkpoints(): List<Map<String, Any>> = list.toList()

  @Synchronized fun clear() = list.clear()
}
