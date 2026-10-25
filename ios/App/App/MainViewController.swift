import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        configureWebView()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        configureWebView()
    }

    private func configureWebView() {
        guard let scrollView = self.webView?.scrollView else { return }
        // No pinch-zoom
        scrollView.pinchGestureRecognizer?.isEnabled = false
        scrollView.isMultipleTouchEnabled = false
        scrollView.bouncesZoom = false
        scrollView.minimumZoomScale = 1.0
        scrollView.maximumZoomScale = 1.0
        // No rubber-band / webby bounce
        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.alwaysBounceHorizontal = false
    }
}
