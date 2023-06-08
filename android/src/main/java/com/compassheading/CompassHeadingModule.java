package com.compassheading;

import android.app.Activity;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.view.Display;
import android.view.Surface;
import android.view.WindowManager;

import com.facebook.react.modules.core.DeviceEventManagerModule;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

@ReactModule(name = CompassHeadingModule.NAME)
public class CompassHeadingModule extends ReactContextBaseJavaModule implements SensorEventListener {
  public static final String NAME = "CompassHeading";

  private static Context mApplicationContext;

  private int mAzimuth = 0; // degree
  private int mFilter = 1;

  private SensorManager sensorManager;

  private final float[] mGravity = new float[3];
  private final float[] mGeomagnetic = new float[3];

  private final float[] R = new float[9];
  private final float[] I = new float[9];

  public CompassHeadingModule(ReactApplicationContext reactContext) {
    super(reactContext);
    mApplicationContext = reactContext.getApplicationContext();
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }


  @ReactMethod
  public void addListener(String eventName) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  @ReactMethod
  public void removeListeners(Integer count) {
    // Keep: Required for RN built in Event Emitter Calls.
  }


  @ReactMethod
  public void start(int filter, Promise promise) {

    try{
      sensorManager = (SensorManager) mApplicationContext.getSystemService(Context.SENSOR_SERVICE);

      Sensor gsensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
      Sensor msensor = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);

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

        float[] orientation = new float[3];
        SensorManager.getOrientation(R, orientation);

        int newAzimuth = (int) Math.toDegrees(orientation[0]);
        newAzimuth = (newAzimuth + 360) % 360;

        Display disp = null;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
          Activity activity = getReactApplicationContext().getCurrentActivity();
          if (activity != null) {
            disp = activity.getDisplay();
          }
        } else {
          disp = (((WindowManager) mApplicationContext.getSystemService(Context.WINDOW_SERVICE))).getDefaultDisplay();
        }

        if (disp != null) {
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

          WritableMap params = Arguments.createMap();
          params.putDouble("heading", mAzimuth);
          params.putDouble("accuracy", 1.0);

          getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("HeadingUpdated", params);
        }
      }
    }
  }

  @Override
  public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
