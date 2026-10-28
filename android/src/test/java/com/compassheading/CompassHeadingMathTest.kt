package com.compassheading

import android.view.Surface
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import kotlin.math.cos
import kotlin.math.sin

class CompassHeadingMathTest {
  private val rotations = intArrayOf(
    Surface.ROTATION_0, Surface.ROTATION_90, Surface.ROTATION_180, Surface.ROTATION_270
  )

  private fun flatMatrix(heading: Double): FloatArray {
    val angle = Math.toRadians(heading)
    val cosine = cos(angle).toFloat()
    val sine = sin(angle).toFloat()
    return floatArrayOf(cosine, sine, 0f, -sine, cosine, 0f, 0f, 0f, 1f)
  }

  private fun assertHeading(expected: Double, matrix: FloatArray, rotation: Int, correction: Double = 0.0) {
    val actual = CompassHeadingMath.heading(matrix, rotation, correction)
    assertNotNull(actual)
    assertEquals(expected, actual!!, 0.0001)
  }

  @Test
  fun flatHeadingsFollowAllDisplayRotations() {
    for (heading in doubleArrayOf(0.0, 45.0, 90.0, 180.0, 270.0, 359.0)) {
      for ((index, rotation) in rotations.withIndex()) {
        assertHeading((heading + index * 90) % 360, flatMatrix(heading), rotation)
      }
    }
  }

  @Test
  fun tiltedLandscapeHeadingsUseTheScreenEdgeInsteadOfAnAngularOffset() {
    // North-facing device pitched 60 degrees and rolled 45 degrees.
    val matrix = floatArrayOf(
      0.70710677f, 0f, 0.70710677f,
      0.6123724f, 0.5f, -0.6123724f,
      -0.35355338f, 0.8660254f, 0.35355338f
    )
    val expected = doubleArrayOf(0.0, 49.106605, 180.0, 229.106605)
    for ((index, rotation) in rotations.withIndex()) {
      assertHeading(expected[index], matrix, rotation)
    }
  }

  @Test
  fun trueNorthCorrectionIsAppliedAfterScreenRotationAndNormalized() {
    for ((index, rotation) in rotations.withIndex()) {
      assertHeading((359.0 + index * 90 + 5) % 360, flatMatrix(359.0), rotation, 5.0)
      assertHeading((1.0 + index * 90 - 5 + 360) % 360, flatMatrix(1.0), rotation, -5.0)
    }
  }

  @Test
  fun aVerticalScreenEdgeDoesNotProduceAnArbitraryHeading() {
    val matrix = floatArrayOf(1f, 0f, 0f, 0f, 0f, -1f, 0f, 1f, 0f)
    assertNull(CompassHeadingMath.heading(matrix, Surface.ROTATION_0, 0.0))
    assertNull(CompassHeadingMath.heading(matrix, Surface.ROTATION_180, 0.0))
    assertHeading(90.0, matrix, Surface.ROTATION_90)
    assertHeading(270.0, matrix, Surface.ROTATION_270)
  }

  @Test
  fun nearlyVerticalHeadingsResumeOnceTheHorizontalProjectionIsLargeEnough() {
    val matrix = floatArrayOf(1f, 0f, 0f, 0f, 0.0009f, -1f, 0f, 1f, 0.0009f)
    assertNull(CompassHeadingMath.heading(matrix, Surface.ROTATION_0, 0.0))
    matrix[4] = 0.0011f
    matrix[8] = 0.0011f
    assertHeading(0.0, matrix, Surface.ROTATION_0)
  }
}
