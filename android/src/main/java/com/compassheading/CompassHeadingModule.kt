// android/src/main/java/com/compassheading/CompassHeadingModule.kt
package com.compassheading

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class CompassHeadingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private var sensorManager: SensorManager? = null
    private var rotationVectorSensor: Sensor? = null

    private var lastHeading = 0.0
    private var updateRate = 3.0  // Default update rate in degrees

    init {
        sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        rotationVectorSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    }

    override fun getName(): String {
        return "CompassHeading"
    }

    @ReactMethod
    fun start(degreeUpdateRate: Double) {
        updateRate = degreeUpdateRate
        rotationVectorSensor?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
        }
    }

    @ReactMethod
    fun stop() {
        sensorManager?.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_ROTATION_VECTOR) {
            val rotationMatrix = FloatArray(9)
            SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)
            val orientation = FloatArray(3)
            SensorManager.getOrientation(rotationMatrix, orientation)
            
            val heading = Math.toDegrees(orientation[0].toDouble()).toFloat()
            val accuracy = event.accuracy.toDouble()

            // Only send update if heading changed significantly
            if (Math.abs(heading - lastHeading) >= updateRate) {
                lastHeading = heading.toDouble()
                
                val params = Arguments.createMap()
                params.putDouble("heading", heading.toDouble())
                params.putDouble("accuracy", accuracy)
                
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("HeadingUpdated", params)
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // No-op, but could handle accuracy updates here if needed
    }
}