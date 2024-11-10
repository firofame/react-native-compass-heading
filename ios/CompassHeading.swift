// ios/CompassHeading.swift
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
    }

    @objc
    func start(_ degreeUpdateRate: Double) {
        locationManager?.headingFilter = degreeUpdateRate
        locationManager?.startUpdatingHeading()
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
    }

    override func stopObserving() {
        hasListeners = false
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        if hasListeners {
            let headingData: [String: Any] = [
                "heading": newHeading.magneticHeading,
                "accuracy": newHeading.headingAccuracy
            ]
            sendEvent(withName: "HeadingUpdated", body: headingData)
        }
    }

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}