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
        NotificationCenter.default.removeObserver(self)
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
        NotificationCenter.default.addObserver(self, selector: #selector(handleOrientationChange), name: UIDevice.orientationDidChangeNotification, object: nil)
    }

    override func stopObserving() {
        hasListeners = false
        // Stop location updates if no listeners are present
        if !hasListeners {
            locationManager?.stopUpdatingHeading()
        }
        NotificationCenter.default.removeObserver(self)
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        // Only send event if there are listeners
        if hasListeners && newHeading.headingAccuracy >= 0 {
            let adjustedHeading = adjustHeadingForOrientation(newHeading.magneticHeading)
            let headingData: [String: Any] = [
                "heading": adjustedHeading,
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

    func adjustHeadingForOrientation(_ heading: Double) -> Double {
        let interfaceOrientation = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.interfaceOrientation

        switch interfaceOrientation {
        case .portrait:
            return heading
        case .portraitUpsideDown:
            return fmod(heading + 180, 360)
        case .landscapeLeft:
            return fmod(heading - 90, 360)
        case .landscapeRight:
            return fmod(heading + 90, 360)
        default:
            return heading
        }
    }

    @objc func handleOrientationChange() {
        if let heading = locationManager?.heading?.magneticHeading, let accuracy = locationManager?.heading?.headingAccuracy {
            let adjustedHeading = adjustHeadingForOrientation(heading)
            let headingData: [String: Any] = [
                "heading": adjustedHeading,
                "accuracy": accuracy
            ]
            sendEvent(withName: "HeadingUpdated", body: headingData)
        }
    }


    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
