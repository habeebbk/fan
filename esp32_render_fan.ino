#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <IRremote.hpp>

const char* WIFI_SSID = "Sky_Giga_Fiber";
const char* WIFI_PASSWORD = "99877899";
// For LOCAL TESTING on your Wi-Fi:
// const char* SERVER_URL = "http://192.168.1.155:3000";
// For PRODUCTION on Render:
const char* SERVER_URL = "https://fan-4z43.onrender.com";
const char* CONTROL_TOKEN = "y7j9k2m5n1q4p8s0v3t6r9w2x5z8";
#define IR_SEND_PIN 4 
#define IR_ADDRESS 0xF300
const uint16_t commands[7] = {0x91,0x8B,0x90,0x8A,0x93,0x88,0x8F};
unsigned long lastPoll = 0;

void setup() {
 Serial.begin(115200);
 delay(1500);
 IrSender.begin(IR_SEND_PIN, DISABLE_LED_FEEDBACK);
 WiFi.mode(WIFI_STA);
 WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
 Serial.println("Connecting WiFi...");
 while (WiFi.status() != WL_CONNECTED) {
   delay(500);
   Serial.print(".");
 }
 Serial.println();
 Serial.print("WiFi Connected! IP: ");
 Serial.println(WiFi.localIP());
}

void loop() {
 if(WiFi.status()!=WL_CONNECTED){
   static unsigned long lastRetry=0;
   if(millis()-lastRetry>10000){lastRetry=millis();WiFi.reconnect();Serial.println("WiFi reconnect...");}
   delay(100);return;
 }
 if(millis()-lastPoll<1000)return;
 lastPoll=millis();
 WiFiClientSecure secureClient;
 WiFiClient plainClient;
 HTTPClient http;
 String url = String(SERVER_URL) + "/api/next";
 bool isHttps = url.startsWith("https://");
 bool beginOk = false;
 if (isHttps) {
   secureClient.setInsecure(); // Demo only: skips server certificate validation
   beginOk = http.begin(secureClient, url);
 } else {
   beginOk = http.begin(plainClient, url);
 }
 if (!beginOk) { Serial.println("HTTP begin failed"); return; }
 http.addHeader("X-Control-Token",CONTROL_TOKEN);
 http.setTimeout(5000);
 int code=http.GET();
 if(code==200){
   String payload=http.getString();
   JsonDocument doc;
   if(deserializeJson(doc,payload)==DeserializationError::Ok && doc["id"].is<int>()){
     int id=doc["id"].as<int>();
     if(id>=0 && id<7){IrSender.sendNEC(IR_ADDRESS,commands[id],0);Serial.printf("Sent IR command %d\n",id);}
   }
 } else if(code!=204){Serial.printf("HTTP status: %d\n",code);}
 http.end();
}
