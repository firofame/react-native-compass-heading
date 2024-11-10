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
        locationManager?.desiredAccuracy = kCLLocationAccuracyNearestTenMeters  // Optional: Desired accuracy
    }

    @objc
    func start(_ degreeUpdateRate: Double) {
        // Ensure location services are enabled before starting
        if CLLocationManager.locationServicesEnabled() {
            locationManager?.headingFilter = degreeUpdateRate
            locationManager?.startUpdatingHeading()
        } else {
            // Handle the case when location services are not enabled
            print("Location services are not enabled.")
        }
    }

    @objc
    func stop() {
        locationManager?.stopUpdatingHeading()
    }

    override func supportedEvents() -> [String]! {
        return ["HeadingUpdated"]
    }

    override func startObserving() {
        hasListeners = true
        // Start location updates only if there are listeners
        if CLLocationManager.locationServicesEnabled() {
            locationManager?.requestWhenInUseAuthorization()  // Request location permission
            locationManager?.startUpdatingHeading()
        }
    }

    override func stopObserving() {
        hasListeners = false
        // Stop location updates if no listeners are present
        if !hasListeners {
            locationManager?.stopUpdatingHeading()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        // Only send event if there are listeners
        if hasListeners && newHeading.headingAccuracy >= 0 {
            let headingData: [String: Any] = [
                "heading": newHeading.magneticHeading,
                "accuracy": newHeading.headingAccuracy
            ]
            sendEvent(withName: "HeadingUpdated", body: headingData)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Handle any errors in the location manager
        print("Location manager failed: \(error.localizedDescription)")
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        // Handle location authorization status changes if necessary
        if status == .denied {
            print("Location permission denied")
        }
    }

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}