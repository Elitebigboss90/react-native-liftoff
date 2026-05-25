package com.liftoff

import android.os.SystemClock

object LiftoffCollector {
  private val list = mutableListOf<Map<String, Any>>()

  @Synchronized fun mark(name: String) {
    list.add(mapOf("name" to name, "timestamp" to SystemClock.elapsedRealtime().toDouble()))
  }

  @Synchronized fun checkpoints(): List<Map<String, Any>> = list.toList()

  @Synchronized fun clear() = list.clear()
}
