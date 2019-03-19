# HAP-NodeRED - Homebridge Accessory Automationn utilizing Node-RED

<p align="center">
    <img src="docs/Homebridge and Node Red.png"/>
</p>

The above Node-RED Flow, turns on my 'Outside Office' light when the powder room is turned on, and turns them both off after 10 seconds. Not practical but a good sample of the power behind Node-RED. [Link](docs/sample.json) to exported flow for above.

# Table of Contents

<!--ts-->
   * [HAP-NodeRED - Homebridge Accessory Automationn utilizing Node-RED](#hap-nodered---homebridge-accessory-automationn-utilizing-node-red)
   * [Table of Contents](#table-of-contents)
   * [Introduction](#introduction)
      * [Caveats](#caveats)
      * [Changes](#changes)
   * [Backlog / Roadmap](#backlog--roadmap)
      * [Dropped items](#dropped-items)
   * [Installation Steps](#installation-steps)
      * [1 - Install Node-RED and Homebridge](#1---install-node-red-and-homebridge)
      * [2 - Prepare Homebridge for integration with HAP-NodeRED](#2---prepare-homebridge-for-integration-with-hap-nodered)
      * [3 - Install HAP-NodeRED into Node-Red](#3---install-hap-nodered-into-node-red)
      * [4 - Start Node-Red](#4---start-node-red)
      * [5 - Initial setup and configuration inside Node-Red](#5---initial-setup-and-configuration-inside-node-red)
      * [6 - Configure 'hb-event' to receive updates from your Accessories](#6---configure-hb-event-to-receive-updates-from-your-accessories)
   * [Node-RED HAP-NodeRed Message Structure](#node-red-hap-nodered-message-structure)
      * [hb-Event](#hb-event)
      * [hb-Resume](#hb-resume)
         * [input](#input)
         * [output](#output)
      * [hb-Status](#hb-status)
         * [input](#input-1)
         * [output](#output-1)
      * [hb-control](#hb-control)
   * [Troubleshooting / DEBUG MODE](#troubleshooting--debug-mode)
      * [To start Node-RED in DEBUG mode, and output HAP-NodeRED debug logs start Node-RED like this.](#to-start-node-red-in-debug-mode-and-output-hap-nodered-debug-logs-start-node-red-like-this)

<!-- Added by: sgracey, at:  -->

<!--te-->

# Introduction

This is an pre-beta release of the ability to integrate Homebridge Accessories into [Node-RED](https://nodered.org) so that you can start flows from Homebridge accessory events and control your existing homebridge accessories.  ( To create accessories in HomeKit, please use node-red-contrib-homekit-bridged. )

![Homebridge Nodes](docs/Homebridge%20Nodes.png)

Four different node types are created, the first node "hb-event" listens for changes to an accessory (ie on/off) and sends a message into Node-Red containing the updated accessory status.  The second node "hb-resume" holds the state of an accessory and supports creating a state resume function. The third node "hb-status" allows you to poll an accessory for status. The forth node "hb-control" allows you to control a homebridge accessory.  Each node is tied to an individual Home App Tile/Service of an accessory (ie on/off and brightness).

Payload from a dimmable lightbulb.

```
{ "On":true, "Brightness":100 }
```

![Homebridge Nodes](docs/HAP%20Event%20Nodes.png)

## Caveats

* Please keep in mind that this integration only works with devices supported/exposed with HomeBridge Plugins.  This does not have visibility to Native HomeKit devices.  ( Similar to my homebridge-alexa plugin. )

* For the 'hb-event' node, the ability of a Accessory to generate events in Real Time is dependent on how the plugin was architected and the actual device.  Some are very good at generating events in real time, and others only generate events when the Home App is opened to the accessory. YMMV.

With a plugin, you can see if it supports Real Time events, by opening the Home App, and looking at an accessory.  Then trigger a local event outside of homebridge/homekit.  If the accessory updates in real time, then it support Real Events.  ( An example of a local event can be turning on a Smart Light Switch, by the local switch.  Another example would be using the vendor app to control an accessory.)

## Changes

Mar 18, 2019 - Version 0.0.39
- Changed `hb state` to `hb resume` to make the use case for the node more self-explanitory. If you had used the `hb state` node in your existing flow, nodeRed will not start unless you manually change the node type in the flow file.  To fix the issue, manually edit the flow file in your .node-red directory, and change the type reference `hb-state` to `hb-resume`
- Changed individual nodes from being charactistic based to device/service based.  When updating from previous versions, you will need to select your devices again.
- With the change in nodes to be device/service based, the payload message structure changed from being individual characteristic based to a JSON object containing all the characteristics you want to update on the device.  ie in the previous version a device control message payload of `true` going to the On characteristic would turn on a light, with this version it would be be represented with a message payload of `{ "On":true, "Brightness":100 }`.  This particular payload would turn on a light and set the brightness to 100.  I made this change to enable easier intgretation with node-red-contrib-homekit-bridged.
- If you send an incorrect message payload to the `hb resume` or `hb control` nodes it would output a debug message containing the valid/supported characteristics for use in the payload object.
- Updated the Homebridge accessory parser, so more diverse devices will now be exposed.

# Backlog / Roadmap

* [x] - Update Node Information with Homebridge Accessory Details ( hapEndpoint, deviceType, description )
* [ ] - Do I need a node that emits events for all homebridge devices?
* [x] - Sort device drop down listing
* [x] - Trim Node name to just accessory Name
* [x] - Documentation - Fix README with latest options
* [ ] - Documentation/Naming - Normalize on Accessory, Service, Event and Characteristic
* [x] - Hap-Node-Client is not reentrant, and multiple requests get lost.  Needs queuing at an instance level.
* [x] - Refactor interface with Hap-Node-Client, and split events into a dedicated evented socket connection and use the regular request module for everything else.
* [x] - Create a service/characteristic based node approach mimicing homekit icons
* [x] - Adjust msg.payload to match other homekit / NodeRED integrations

## Dropped items

* [ ] - Add timestamp to Node msg object

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

## 6 - Configure 'hb-event' to receive updates from your Accessories

* 6.1 Double click on hb event node ( now called 'Choose accessory/event')

![Populated](docs/HAP%20Event%20Populated.png)

* 6.2 The device drop down should now be populated with all your Homebridge accessories.

![Populated](docs/HAP%20Event%20Drop%20Down.png)

The accessory naming convention is:

Accessory Name and Accessory Service Type

# Node-RED HAP-NodeRed Message Structure

## hb-Event

Message is structured like this

```
msg = {
  name: Accessory Name,
  payload: { "On":true, "Brightness":100 }
  Homebridge: Homebridge instance name,
  Manufacturer: Plugin Manufacturer,
  Type: Homebridge device type,
  _device: Unique device identifier,
  _confId: node.confId,
  _rawEvent: Raw event message
};
```

## hb-Resume

### input

Based on the message input payload and state of the accessory the output changes.

For "On":true, the node just passes the message to output.  For the first "On":false, the output is the state of the accessory from prior to the last turn on.  For the second "On":false, the out is "On":false.

```
msg = {
  payload: { "On":true, "Brightness":100 }
};
```

### output

```
msg = {
  payload: { "On":true, "Brightness":100 }
};
```

## hb-Status

### input



### output

Message is structured like this

```
msg = {
  name: Accessory Name,
  payload: { "On":true, "Brightness":100 }
  Homebridge: Homebridge instance name,
  Manufacturer: Plugin Manufacturer,
  Type: Homebridge device type,
  _device: Unique device identifier,
  _confId: node.confId,
  _rawEvent: Raw event message
};
```

## hb-control

The hb-control node only looks at msg.payload value, and ignore's all others.

```
msg = {
        payload: { "On":true, "Brightness":100 }
      }
```

# Troubleshooting / DEBUG MODE

## To start Node-RED in DEBUG mode, and output HAP-NodeRED debug logs start Node-RED like this.

    DEBUG=*,-express* node-red
