// Name: Notifications
// ID: mdwaltersnotifications
// Description: Display notifications.
// License: MIT

(function (Scratch) {
  "use strict";

  let denied = false;
  /** @type {Notification|null} */
  let notification = null;

  const askForNotificationPermission = async () => {
    try {
      const allowedByVM = await Scratch.canNotify();
      if (!allowedByVM) {
        throw new Error("Denied by VM");
      }

      const allowedByBrowser = await Notification.requestPermission();
      if (allowedByBrowser === "denied") {
        throw new Error("Denied by browser");
      }

      denied = false;
      return true;
    } catch (e) {
      denied = true;
      console.warn("Could not request notification permissions", e);
      return false;
    }
  };

  const isAndroid = () => navigator.userAgent.includes("Android");

  const getServiceWorkerRegistration = () => {
    if (!("serviceWorker" in navigator)) return null;
    // This is only needed on Android
    if (!isAndroid()) return null;
    return navigator.serviceWorker.getRegistration();
  };

  class Notifications {
    constructor() {
      Scratch.vm.runtime.on("RUNTIME_DISPOSED", () => {
        this._closeNotification();
      });
    }
    getInfo() {
      return {
        id: "mdwaltersnotifications",
        name: Scratch.translate("Notifications"),
        blocks: [
          {
            opcode: "requestPermission",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("request notification permission"),
          },
          {
            opcode: "hasPermission",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("has notification permission?"),
            disableMonitor: true,
          },
          {
            opcode: "showNotification",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("create notification with text [text]"),
            arguments: {
              text: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate({
                  default: "Hello, world!",
                  description: "Default text in the create notification block",
                }),
              },
            },
          },
          {
            opcode: "closeNotification",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("close notification"),
          },
        ],
      };
    }

    requestPermission() {
      return askForNotificationPermission();
    }

    hasPermission() {
      if (denied) {
        return false;
      }
      return askForNotificationPermission();
    }

    async _showNotification(text) {
      if (await this.hasPermission()) {
        const title = Scratch.translate({
          default: "Notification from project",
          description: "Title of notifications created by the project",
        });
        const options = {
          body: text,
        };
        try {
          notification = new Notification(title, options);
        } catch (e) {
          // On Android we need to go through the service worker.
          const registration = await getServiceWorkerRegistration();
          if (registration) {
            try {
              await registration.showNotification(title, options);
            } catch (e2) {
              console.error("Could not show notification", e, e2);
            }
          } else {
            console.error("Could not show notification", e);
          }
        }
      }
    }

    showNotification(args) {
      this._showNotification(Scratch.Cast.toString(args.text));
    }

    async _closeNotification() {
      if (notification) {
        notification.close();
        notification = null;
      }

      const registration = await getServiceWorkerRegistration();
      if (registration) {
        const notifications = await registration.getNotifications();
        for (const notification of notifications) {
          notification.close();
        }
      }
    }

    closeNotification() {
      this._closeNotification();
    }
  }

  Scratch.extensions.register(new Notifications());
})(Scratch);
