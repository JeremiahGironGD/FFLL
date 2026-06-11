import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        checkForUpdates()
    }

    func checkForUpdates() {
        let lastCheckKey = "ffll-last-update-check-ios"
        let currentVersion = "1.0.0"
        let updateCheckInterval: TimeInterval = 24 * 60 * 60 // 24 hours
        
        // Check if we've already checked recently
        if let lastCheck = UserDefaults.standard.object(forKey: lastCheckKey) as? TimeInterval {
            let timeSinceCheck = Date().timeIntervalSince1970 - lastCheck
            if timeSinceCheck < updateCheckInterval {
                return
            }
        }
        
        // Check GitHub API for latest release
        let urlString = "https://api.github.com/repos/JeremiahGironGD/FFLL/releases/latest"
        guard let url = URL(string: urlString) else { return }
        
        var request = URLRequest(url: url)
        request.setValue("FFLL-App", forHTTPHeaderField: "User-Agent")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            // Update check timestamp immediately to prevent spamming
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
        let latest = versionToNumber(latestVersion)
        let current = versionToNumber(currentVersion)
        return latest > current
    }
    
    func versionToNumber(_ version: String) -> Int {
        let parts = version.split(separator: ".").compactMap { Int($0) }
        let major = parts.count > 0 ? parts[0] : 0
        let minor = parts.count > 1 ? parts[1] : 0
        let patch = parts.count > 2 ? parts[2] : 0
        return major * 10000 + minor * 100 + patch
    }
    
    func showUpdateNotification(latestVersion: String, json: [String: Any]) {
        // Get the app's key window
        guard let keyWindow = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first?.windows
            .first(where: { $0.isKeyWindow }) else { return }
        
        let alertController = UIAlertController(
            title: "🚀 Update Available",
            message: "A new version (\(latestVersion)) of FFLL is available! Update now to get the latest features and improvements.",
            preferredStyle: .alert
        )
        
        // Find download URL
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
        
        // Update action
        alertController.addAction(UIAlertAction(title: "Update Now", style: .default) { _ in
            if let url = URL(string: downloadUrl), UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
            }
        })
        
        // Later action
        alertController.addAction(UIAlertAction(title: "Later", style: .cancel))
        
        // Find the top-most view controller to present the alert
        var topController = keyWindow.rootViewController
        while let presentedViewController = topController?.presentedViewController {
            topController = presentedViewController
        }
        
        if let topVC = topController {
            topVC.present(alertController, animated: true)
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
