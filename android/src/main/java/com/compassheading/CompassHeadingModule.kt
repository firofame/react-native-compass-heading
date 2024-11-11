package com.compassheading

import android.app.Activity
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.view.Surface
import android.view.WindowManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs
import kotlin.math.toDegrees

class CompassHeadingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    companion object {
        const val NAME = "CompassHeading"
    }

    private val mApplicationContext: Context = reactContext.applicationContext
    private var mAzimuth: Int = 0 // degree
    private var mFilter: Int = 1

    private var sensorManager: SensorManager? = null
    private val mGravity = FloatArray(3)
    private val mGeomagnetic = FloatArray(3)
    private val R = FloatArray(9)
    private val I = FloatArray(9)

    override fun getName(): String {
        return NAME
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native built-in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for React Native built-in Event Emitter Calls
    }

    @ReactMethod
    fun start(filter: Int, promise: Promise) {
        try {
            sensorManager = mApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager

            val gsensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            val msensor = sensorManager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)

            sensorManager?.registerListener(this, gsensor, SensorManager.SENSOR_DELAY_GAME)
            sensorManager?.registerListener(this, msensor, SensorManager.SENSOR_DELAY_GAME)

            mFilter = filter
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("failed_start", e.message)
        }
    }

    @ReactMethod
    fun stop() {
        sensorManager?.unregisterListener(this)
    }

    @ReactMethod
    fun hasCompass(promise: Promise) {
        try {
            val manager = mApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            val hasCompass = manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null &&
                    manager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null
            promise.resolve(hasCompass)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        val alpha = 0.97f
        synchronized(this) {
            when (event.sensor.type) {
                Sensor.TYPE_ACCELEROMETER -> {
                    mGravity[0] = alpha * mGravity[0] + (1 - alpha) * event.values[0]
                    mGravity[1] = alpha * mGravity[1] + (1 - alpha) * event.values[1]
                    mGravity[2] = alpha * mGravity[2] + (1 - alpha) * event.values[2]
                }
                Sensor.TYPE_MAGNETIC_FIELD -> {
                    mGeomagnetic[0] = alpha * mGeomagnetic[0] + (1 - alpha) * event.values[0]
                    mGeomagnetic[1] = alpha * mGeomagnetic[1] + (1 - alpha) * event.values[1]
                    mGeomagnetic[2] = alpha * mGeomagnetic[2] + (1 - alpha) * event.values[2]
                }
            }

            val success = SensorManager.getRotationMatrix(R, I, mGravity, mGeomagnetic)
            if (success) {
                val orientation = FloatArray(3)
                SensorManager.getOrientation(R, orientation)
                var newAzimuth = toDegrees(orientation[0].toDouble()).toInt()
                newAzimuth = (newAzimuth + 360) % 360

                val display = getDisplay()
                display?.let {
                    val rotation = it.rotation
                    newAzimuth = when (rotation) {
                        Surface.ROTATION_90 -> (newAzimuth + 90) % 360
                        Surface.ROTATION_270 -> (newAzimuth + 270) % 360
                        Surface.ROTATION_180 -> (newAzimuth + 180) % 360
                        else -> newAzimuth
                    }
                }

                if (abs(mAzimuth - newAzimuth) > mFilter) {
                    mAzimuth = newAzimuth
                    val params = Arguments.createMap().apply {
                        putDouble("heading", mAzimuth.toDouble())
                        putDouble("accuracy", 1.0)
                    }
                    reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("HeadingUpdated", params)
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}

    private fun getDisplay(): Display? {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            val activity = reactApplicationContext.currentActivity
            activity?.display
        } else {
            (mApplicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay
        }
    }
}