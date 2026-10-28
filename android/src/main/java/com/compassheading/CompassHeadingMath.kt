package com.compassheading

import android.view.Surface
import kotlin.math.atan2

internal object CompassHeadingMath {
  fun heading(matrix: FloatArray, displayRotation: Int, declination: Double): Double? {
    // Project the screen's top edge onto east/north before calculating azimuth.
    // Adding a display angle to an existing azimuth is only correct for a flat device.
    val axis = when (displayRotation) {
      Surface.ROTATION_90, Surface.ROTATION_270 -> 0
      else -> 1
    }
    val sign = when (displayRotation) {
      Surface.ROTATION_180, Surface.ROTATION_270 -> -1
      else -> 1
    }
    val east = matrix[axis].toDouble() * sign
    val north = matrix[axis + 3].toDouble() * sign
    // A vertical screen edge has no horizontal heading.
    if (east * east + north * north < 1e-6) return null

    val heading = Math.toDegrees(atan2(east, north)) + declination
    return ((heading % 360) + 360) % 360
  }
}
