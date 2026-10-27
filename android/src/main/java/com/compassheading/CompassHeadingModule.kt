package com.compassheading

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.view.Surface
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlin.math.abs
import kotlin.math.min

class CompassHeadingModule(reactContext: ReactApplicationContext) :
  NativeCompassHeadingSpec(reactContext), SensorEventListener {

  private val sensorManager =
    reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
  private val gravity = FloatArray(3)
  private val geomagnetic = FloatArray(3)
  private val rotationMatrix = FloatArray(9)
  private val orientation = FloatArray(3)
  private var lastHeading: Double? = null
  private var updateRate = 1.0
  private var updating = false

  @Synchronized
  override fun start(degreeUpdateRate: Double, promise: Promise) {
    if (!degreeUpdateRate.isFinite() || degreeUpdateRate < 0) {
      promise.reject("invalid_update_rate", "degreeUpdateRate must be a finite, non-negative number")
      return
    }
    stop()
    val manager = sensorManager
    val accelerometer = manager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    val magnetometer = manager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
    if (manager == null || accelerometer == null || magnetometer == null) {
      promise.reject("not_available", "This device does not have a compass")
      return
    }

    gravity.fill(0f)
    geomagnetic.fill(0f)
    lastHeading = null
    updateRate = degreeUpdateRate
    updating = true
    val gravityRegistered =
      manager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME)
    val magneticRegistered =
      manager.registerListener(this, magnetometer, SensorManager.SENSOR_DELAY_GAME)
    if (!gravityRegistered || !magneticRegistered) {
      stop()
      promise.reject("failed_start", "Could not register compass sensor listeners")
      return
    }
    promise.resolve(true)
  }

  @Synchronized
  override fun stop() {
    updating = false
    sensorManager?.unregisterListener(this)
  }

  override fun hasCompass(promise: Promise) {
    promise.resolve(
      sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null &&
        sensorManager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null
    )
  }

  @Synchronized
  override fun onSensorChanged(event: SensorEvent) {
    if (!updating) return

    val values = when (event.sensor.type) {
      Sensor.TYPE_ACCELEROMETER -> gravity
      Sensor.TYPE_MAGNETIC_FIELD -> geomagnetic
      else -> return
    }
    val alpha = 0.97f
    for (index in 0..2) {
      values[index] = alpha * values[index] + (1 - alpha) * event.values[index]
    }
    if (!SensorManager.getRotationMatrix(rotationMatrix, null, gravity, geomagnetic)) return

    SensorManager.getOrientation(rotationMatrix, orientation)
    val azimuth = (Math.toDegrees(orientation[0].toDouble()) + 360) % 360
    val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      reactApplicationContext.currentActivity?.display
    } else {
      @Suppress("DEPRECATION")
      (reactApplicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay
    }
    val offset = when (display?.rotation) {
      Surface.ROTATION_90 -> 90
      Surface.ROTATION_180 -> 180
      Surface.ROTATION_270 -> 270
      else -> 0
    }
    val heading = (azimuth + offset) % 360
    val previous = lastHeading
    val difference = if (previous == null) 0.0 else abs(heading - previous)
    if (previous == null || updateRate == 0.0 || min(difference, 360 - difference) > updateRate) {
      lastHeading = heading
      emitOnHeadingUpdated(Arguments.createMap().apply {
        putDouble("heading", heading.toInt().toDouble())
        putDouble("accuracy", 1.0)
      })
    }
  }

  override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) = Unit

  override fun invalidate() {
    stop()
    super.invalidate()
  }

  companion object {
    const val NAME = NativeCompassHeadingSpec.NAME
  }
}
