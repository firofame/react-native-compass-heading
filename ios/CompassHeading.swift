import Foundation
import CoreLocation
import React

@objc(CompassHeading)
class CompassHeading: RCTEventEmitter, CLLocationManagerDelegate {
    private var locationManager: CLLocationManager?
    private var hasListeners = false

    override init() {
        super.init()
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.headingFilter = 1  // Default update rate
        locationManager?.desiredAccuracy = kCLLocationAccuracyNearestTenMeters // Optional: Set accuracy
    }

    @objc
    func start(_ degreeUpdateRate: Double) {
        locationManager?.headingFilter = degreeUpdateRate
        
        if hasListeners {
            if CLLocationManager.locationServicesEnabled() {
                locationManager?.requestWhenInUseAuthorization()
                locationManager?.startUpdatingHeading()
            } else {
                NSLog("CompassHeading: Location services are not enabled.")
            }
        } else {
            NSLog("CompassHeading: No listeners, not starting heading updates.")
        }
    }

    @objc
    func stop() {
        if hasListeners {
            locationManager?.stopUpdatingHeading()
        }
    }

    override func supportedEvents() -> [String]! {
        return ["HeadingUpdated"]
    }

    override func startObserving() {
        hasListeners = true
        // Start updating heading only when a listener is active
        if CLLocationManager.locationServicesEnabled() {
            locationManager?.requestWhenInUseAuthorization()
            locationManager?.startUpdatingHeading()
        } else {
            NSLog("CompassHeading: Location services are not enabled.")
        }
    }

    override func stopObserving() {
        hasListeners = false
        // Stop updating heading when no listeners are active
        if !hasListeners {
            locationManager?.stopUpdatingHeading()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        if hasListeners {
            let headingData: [String: Any] = [
                "heading": newHeading.magneticHeading,
                "accuracy": newHeading.headingAccuracy
            ]
            sendEvent(withName: "HeadingUpdated", body: headingData)
        } else {
            NSLog("CompassHeading: No listeners, skipping heading update.")
        }
    }

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}