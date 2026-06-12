import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        self.checkForUpdates()
    }

    func checkForUpdates() {
        let lastCheckKey = "ffll-last-update-check-ios"
        let currentVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let updateCheckInterval: TimeInterval = 24 * 60 * 60 // 24 hours
        
        if let lastCheck = UserDefaults.standard.object(forKey: lastCheckKey) as? TimeInterval {
            let timeSinceCheck = Date().timeIntervalSince1970 - lastCheck
            if timeSinceCheck < updateCheckInterval {
                return
            }
        }
        
        let urlString = "https://api.github.com/repos/JeremiahGironGD/FFLL/releases/latest"
        guard let url = URL(string: urlString) else { return }
        
        var request = URLRequest(url: url)
        request.setValue("FFLL-App", forHTTPHeaderField: "User-Agent")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: lastCheckKey)
            
            guard let data = data, error == nil else { return }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let tagName = json["tag_name"] as? String {
                    let latestVersion = tagName.replacingOccurrences(of: "v", with: "")
                    
                    if self?.isNewerVersion(latestVersion, currentVersion: currentVersion) ?? false {
                        DispatchQueue.main.async {
                            self?.showUpdateNotification(latestVersion: latestVersion, json: json)
                        }
                    }
                }
            } catch {
                // Silently fail
            }
        }.resume()
    }
    
    func isNewerVersion(_ latestVersion: String, currentVersion: String) -> Bool {
        return latestVersion.compare(currentVersion, options: .numeric) == .orderedDescending
    }
    
    func showUpdateNotification(latestVersion: String, json: [String: Any]) {
        guard let keyWindow = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow }) else { return }
        
        let alertController = UIAlertController(
            title: "🚀 Update Available",
            message: "A new version (\(latestVersion)) of FFLL is available! Update now to get the latest features and improvements.",
            preferredStyle: .alert
        )
        
        var downloadUrl = "https://github.com/JeremiahGironGD/FFLL/releases/latest"
        if let assets = json["assets"] as? [[String: Any]] {
            for asset in assets {
                if let name = asset["name"] as? String, name.hasSuffix(".ipa") || name.hasSuffix(".apk"),
                   let url = asset["browser_download_url"] as? String {
                    downloadUrl = url
                    break
                }
            }
        }
        
        alertController.addAction(UIAlertAction(title: "Update Now", style: .default) { _ in
            if let url = URL(string: downloadUrl) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        })
        
        alertController.addAction(UIAlertAction(title: "Later", style: .cancel))
        
        var topController = keyWindow.rootViewController
        while let presentedViewController = topController?.presentedViewController {
            topController = presentedViewController
        }
        
        if let topVC = topController {
            topVC.present(alertController, animated: true)
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
