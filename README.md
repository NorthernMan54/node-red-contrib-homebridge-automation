# HAP-NodeRED - Homebridge Accessory and Node-RED Integration

<p align="center">
    <img src="docs/Homebridge and Node Red.png"/>
</p>

The above Node-RED Flow, turns on my 'Outside Office' light when the powder room is turned on, and turns them both off after 10 seconds. Not practical but a good sample of the power behind Node-RED.

# Table of Contents

<!--ts-->
   * [HAP-NodeRED - Homebridge Accessory and Node-RED Integration](#hap-nodered---homebridge-accessory-and-node-red-integration)
   * [Table of Contents](#table-of-contents)
   * [Introduction](#introduction)
      * [Caveats](#caveats)
   * [Backlog / Roadmap](#backlog--roadmap)
      * [Dropped items](#dropped-items)
   * [Installation Steps](#installation-steps)
      * [1 - Install Node-RED and Homebridge](#1---install-node-red-and-homebridge)
      * [2 - Prepare Homebridge for integration with HAP-NodeRED](#2---prepare-homebridge-for-integration-with-hap-nodered)
      * [3 - Install HAP-NodeRED into Node-Red](#3---install-hap-nodered-into-node-red)
      * [4 - Start Node-Red](#4---start-node-red)
      * [5 - Initial setup and configuration inside Node-Red](#5---initial-setup-and-configuration-inside-node-red)
      * [6 - Configure 'hb event' to receive updates from your Accessories](#6---configure-hb-event-to-receive-updates-from-your-accessories)
   * [Node-RED HAP-NodeRed Message Structure](#node-red-hap-nodered-message-structure)
      * [hb-Event](#hb-event)
      * [hb-Status](#hb-status)
      * [hb-control](#hb-control)
   * [Troubleshooting / DEBUG MODE](#troubleshooting--debug-mode)
      * [To start Node-RED in DEBUG mode, and output HAP-NodeRED debug logs start Node-RED like this.](#to-start-node-red-in-debug-mode-and-output-hap-nodered-debug-logs-start-node-red-like-this)

<!-- Added by: sgracey, at:  -->

<!--te-->

# Introduction

This is an Alpha release of the ability to integrate Homebridge Accessories into [Node-RED](https://nodered.org) so that you can start flows from Homebridge accessory events and control your existing homebridge accessories.  ( To create accessories in HomeKit, please use node-red-contrib-homekit-bridged. )

![Homebridge Nodes](docs/Homebridge%20Nodes.png)

This create's three separate node's in Node-Red, the first node "hb event" listens for changes to an accessory (ie on/off) and sends a message into Node-Red containing the updated accessory status.  The second node "hb status" allows you to poll an accessory for status. The third node "hb control" allows you to control a homebridge accessory.  Each node is tied to an individual characteristic of an accessory (ie on/off or brightness).  Using a dimmable light bulb as an example, you would configure two nodes for it.  The first for On/Off and the second for brightness.

![Homebridge Nodes](docs/HAP%20Event%20Nodes.png)

## Caveats

* Please keep in mind that this integration only works with devices supported/exposed with HomeBridge Plugins.  This does not have visibility to Native HomeKit devices.  ( Similar to my homebridge-alexa plugin. )

* For the 'hb Event' node, the ability of a Accessory to generate events in Real Time is dependent on how the plugin was architected and the actual device.  Some are very good at generating events in real time, and others only generate events when the Home App is opened to the accessory. YMMV.

With a plugin, you can see if it supports Real Time events, by opening the Home App, and looking at an accessory.  Then trigger a local event outside of homebridge/homekit.  If the accessory updates in real time, then it support Real Events.  ( An example of a local event can be turning on a Smart Light Switch, by the local switch.  Another example would be using the vendor app to control an accessory.)    

# Backlog / Roadmap

* [x] - Update Node Information with Homebridge Accessory Details ( hapEndpoint, deviceType, description )
* [X] - Do I need a node that emits events for all homebridge devices?
* [x] - Sort device drop down listing
* [x] - Trim Node name to just accessory Name
* [ ] - Add timestamp to Node msg object
* [ ] - Documentation - Fix README with latest options
* [ ] - Documentation/Naming - Normalize on Accessory, Service, Event and Characteristic
* [ ] - Hap-Node-Client is not reentrant, and multiple requests get lost.  Needs queuing at an instance level.

## Dropped items

* [ ] - Adjust msg.payload to match other homekit / NodeRED integrations

# Installation Steps

## 1 - Install Node-RED and Homebridge

This is covered in alot of other places, so I won't cover it here.

## 2 - Prepare Homebridge for integration with HAP-NodeRED

Place your homebridge instances into "INSECURE MODE".  This is same as my [Homebridge Alexa](https://github.com/NorthernMan54/homebridge-alexa) plugin, and you just need to follow the [Prepare homebridge for plugin](https://github.com/NorthernMan54/homebridge-alexa#prepare-homebridge-for-plugin-installation) instructions there.

## 3 - Install HAP-NodeRED into Node-Red

    cd ~/.node-red
    npm install -g https://github.com/NorthernMan54/HAP-NodeRed

## 4 - Start Node-Red

## 5 - Initial setup and configuration inside Node-Red

* 5.1 Select 'hb event' node and place onto flow.
* 5.2 Double click on hb event node ( now called 'Choose accessory/event')

![Choose](docs/Choose.png)

* 5.3 Please select the **pencil** to the right of the PIN Field.

![Pencil](docs/Pencil.png)

* 5.4 Please enter your PIN, and select **Add**.

![Pin Entered](docs/Pin%20Entered.png)

* 5.5 Now select **Done**.

![Done](docs/HAP%20Event%20Done.png)

* 5.6 Now select **Deploy**
* 5.7 Please wait about 30 seconds.  ( Node-RED is busy discovering all your accessories.)
* 5.8 Initial setup and config is complete.

## 6 - Configure 'hb event' to receive updates from your Accessories

* 6.1 Double click on hb event node ( now called 'Choose accessory/event')

![Populated](docs/HAP%20Event%20Populated.png)

* 6.2 The device drop down should now be populated with all your Homebridge accessories.

![Populated](docs/HAP%20Event%20Drop%20Down.png)

The accessory naming convention is:

Accessory Name, Accessory Service Type and Accessory characteristic

# Node-RED HAP-NodeRed Message Structure

## hb-Event

Message is structured like this

```
msg = {
  name: node.name,
  payload: event.status,
  Homebridge: node.hbDevice.homebridge,
  Manufacturer: node.hbDevice.manufacturer,
  Type: node.hbDevice.deviceType,
  Function: node.hbDevice.function,
  _confId: node.confId,
  _rawEvent: event
};
```

## hb-Status

Message is structured like this

```
msg = {
  name: node.name,
  payload: event.status,
  Homebridge: node.hbDevice.homebridge,
  Manufacturer: node.hbDevice.manufacturer,
  Type: node.hbDevice.deviceType,
  Function: node.hbDevice.function,
  _confId: node.confId
};
```

## hb-control

The hb-control node only looks at msg.payload value, and ignore's all others.

```
msg = {
        payload: Changed value for accessories characteristic
      }
```

# Troubleshooting / DEBUG MODE

## To start Node-RED in DEBUG mode, and output HAP-NodeRED debug logs start Node-RED like this.

    DEBUG=*,-express* node-red
