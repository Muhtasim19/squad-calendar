import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        disableZoom()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        disableZoom()
    }

    private func disableZoom() {
        guard let scrollView = self.webView?.scrollView else { return }
        scrollView.pinchGestureRecognizer?.isEnabled = false
        scrollView.isMultipleTouchEnabled = false
        scrollView.bouncesZoom = false
        scrollView.minimumZoomScale = 1.0
        scrollView.maximumZoomScale = 1.0
    }
}
