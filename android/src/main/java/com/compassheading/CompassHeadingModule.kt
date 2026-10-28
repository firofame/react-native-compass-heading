package com.compassheading

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Surface
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlin.math.abs
import kotlin.math.min

class CompassHeadingModule(reactContext: ReactApplicationContext) :
  NativeCompassHeadingSpec(reactContext), SensorEventListener, LocationListener {

  private val sensorManager =
    reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
  private val locationManager =
    reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
  private val handler = Handler(Looper.getMainLooper())
  private val gravity = FloatArray(3)
  private val geomagnetic = FloatArray(3)
  private val rotationMatrix = FloatArray(9)
  private val orientation = FloatArray(3)
  private var lastHeading: Double? = null
  private var updateRate = 1.0
  private var updating = false
  private var useTrueNorth = false
  private var declination: Double? = null
  private var receivedTrueHeading = false
  private var generation = 0
  private var locationTimeout: Runnable? = null
  private var locationProviders = emptyList<String>()

  @Synchronized
  override fun start(degreeUpdateRate: Double, useTrueNorth: Boolean, promise: Promise) {
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
    this.useTrueNorth = useTrueNorth
    declination = null
    receivedTrueHeading = false
    updating = true
    if (useTrueNorth) {
      if (!hasLocationPermission()) {
        stop()
        promise.reject("permission_denied", "Location permission is required for true north")
        return
      }
      val locations = locationManager
      if (locations == null) {
        stop()
        promise.reject("location_unavailable", "Location service is not available")
        return
      }
      try {
        val fineLocation = reactApplicationContext.checkSelfPermission(
          Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        locationProviders = locations.getProviders(true).filter {
          it == LocationManager.NETWORK_PROVIDER ||
            (it == LocationManager.GPS_PROVIDER &&
              (fineLocation || Build.VERSION.SDK_INT >= Build.VERSION_CODES.S))
        }
        if (locationProviders.isEmpty()) {
          stop()
          promise.reject("location_disabled", "Enable a location provider to use true north")
          return
        }
        for (provider in locationProviders) {
          locations.requestLocationUpdates(provider, 60_000L, 1000f, this, Looper.getMainLooper())
        }
      } catch (error: SecurityException) {
        stop()
        promise.reject("permission_denied", "Location permission is required for true north", error)
        return
      } catch (error: IllegalArgumentException) {
        stop()
        promise.reject("location_unavailable", "Could not start location updates", error)
        return
      }
      val currentGeneration = generation
      val timeout = Runnable {
        synchronized(this) {
          if (updating && generation == currentGeneration && !receivedTrueHeading) {
            failWithError(
              "location_unavailable",
              "Could not obtain a true-north reading within 30 seconds"
            )
          }
        }
      }
      locationTimeout = timeout
      handler.postDelayed(timeout, 30_000L)
    }
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
    ++generation
    updating = false
    sensorManager?.unregisterListener(this)
    locationManager?.removeUpdates(this)
    locationTimeout?.let { handler.removeCallbacks(it) }
    locationTimeout = null
    locationProviders = emptyList()
    declination = null
  }

  private fun hasLocationPermission(): Boolean =
    reactApplicationContext.checkSelfPermission(
      Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED ||
      reactApplicationContext.checkSelfPermission(
        Manifest.permission.ACCESS_FINE_LOCATION
      ) == PackageManager.PERMISSION_GRANTED

  private fun failWithError(code: String, message: String) {
    stop()
    emitOnError(Arguments.createMap().apply {
      putString("code", code)
      putString("message", message)
    })
  }

  @Synchronized
  override fun onLocationChanged(location: Location) {
    if (!updating || !useTrueNorth ||
      !location.hasAccuracy() ||
      location.accuracy < 0 ||
      SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos > 300_000_000_000L
    ) return

    declination = GeomagneticField(
      location.latitude.toFloat(),
      location.longitude.toFloat(),
      if (location.hasAltitude()) location.altitude.toFloat() else 0f,
      System.currentTimeMillis()
    ).declination.toDouble()
  }

  @Synchronized
  override fun onProviderDisabled(provider: String) {
    if (!updating || !useTrueNorth) return
    if (!hasLocationPermission()) {
      failWithError("permission_denied", "Location permission is required for true north")
    } else if (locationProviders.none { locationManager?.isProviderEnabled(it) == true }) {
      failWithError("location_disabled", "Enable a location provider to use true north")
    }
  }

  override fun onProviderEnabled(provider: String) = Unit

  @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
  override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

  override fun hasCompass(promise: Promise) {
    promise.resolve(
      sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null &&
        sensorManager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null
    )
  }

  @Synchronized
  override fun onSensorChanged(event: SensorEvent) {
    if (!updating) return
    if (useTrueNorth && !hasLocationPermission()) {
      failWithError("permission_denied", "Location permission is required for true north")
      return
    }

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
    val correction = if (useTrueNorth) declination ?: return else 0.0
    var heading = (azimuth + offset + correction) % 360
    if (heading < 0) heading += 360
    if (useTrueNorth) {
      receivedTrueHeading = true
      locationTimeout?.let { handler.removeCallbacks(it) }
      locationTimeout = null
    }
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
