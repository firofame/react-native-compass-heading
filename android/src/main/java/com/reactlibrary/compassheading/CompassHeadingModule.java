package com.reactlibrary.compassheading;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;

import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.view.Display;
import android.view.WindowManager;
import android.view.Surface;

import android.content.Context;

import com.facebook.react.modules.core.DeviceEventManagerModule;


public class CompassHeadingModule extends ReactContextBaseJavaModule implements SensorEventListener {

    private final ReactApplicationContext reactContext;

    private static Context mApplicationContext;

    private int mAzimuth = 0; // degree
    private int mFilter = 1;

    private SensorManager sensorManager;

    private Sensor gsensor;
    private Sensor msensor;

    private float[] mGravity = new float[3];
    private float[] mGeomagnetic = new float[3];

    private float[] R = new float[9];
    private float[] I = new float[9];

    public CompassHeadingModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        mApplicationContext = reactContext.getApplicationContext();
    }

    @Override
    public String getName() {
        return "CompassHeading";
    }

    @ReactMethod
    public void start(int filter, Promise promise) {

        try{
            sensorManager = (SensorManager) mApplicationContext.getSystemService(Context.SENSOR_SERVICE);

            gsensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            msensor = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);

            sensorManager.registerListener(this, gsensor, SensorManager.SENSOR_DELAY_GAME);
            sensorManager.registerListener(this, msensor, SensorManager.SENSOR_DELAY_GAME);

            mFilter = filter;
            promise.resolve(true);
        }
        catch(Exception e){
            promise.reject("failed_start", e.getMessage());
        }
    }

    @ReactMethod
    public void stop() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }

    @ReactMethod
    public void hasCompass(Promise promise) {

        try{
            SensorManager manager = (SensorManager) mApplicationContext.getSystemService(Context.SENSOR_SERVICE);

            boolean res = manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null &&
                manager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null;

            promise.resolve(res);
        }
        catch(Exception e){
            promise.resolve(false);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {

        final float alpha = 0.97f;

        synchronized (this) {
            if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {

                mGravity[0] = alpha * mGravity[0] + (1 - alpha)
                        * event.values[0];
                mGravity[1] = alpha * mGravity[1] + (1 - alpha)
                        * event.values[1];
                mGravity[2] = alpha * mGravity[2] + (1 - alpha)
                        * event.values[2];
            }

            if (event.sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) {

                mGeomagnetic[0] = alpha * mGeomagnetic[0] + (1 - alpha)
                        * event.values[0];
                mGeomagnetic[1] = alpha * mGeomagnetic[1] + (1 - alpha)
                        * event.values[1];
                mGeomagnetic[2] = alpha * mGeomagnetic[2] + (1 - alpha)
                        * event.values[2];

            }

            boolean success = SensorManager.getRotationMatrix(R, I, mGravity, mGeomagnetic);

            if (success) {

                float orientation[] = new float[3];
                SensorManager.getOrientation(R, orientation);

                int newAzimuth = (int) Math.toDegrees(orientation[0]);
                newAzimuth = (newAzimuth + 360) % 360;

                Display disp = (((WindowManager) mApplicationContext.getSystemService(Context.WINDOW_SERVICE))).getDefaultDisplay();

                if(disp != null){
                    int rotation = disp.getRotation();

                    if(rotation == Surface.ROTATION_90){
                        newAzimuth = (newAzimuth + 90) % 360;
                    }
                    else if(rotation == Surface.ROTATION_270){
                        newAzimuth = (newAzimuth + 270) % 360;
                    }
                    else if(rotation == Surface.ROTATION_180){
                        newAzimuth = (newAzimuth + 180) % 360;
                    }
                }

                if (Math.abs(mAzimuth - newAzimuth) > mFilter) {

                    mAzimuth = newAzimuth;

                    getReactApplicationContext()
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("HeadingUpdated", mAzimuth);
                }
            }
        }


    }


    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {

    }
}
