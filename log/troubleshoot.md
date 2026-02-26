# Hardware

## ESP

- [x] TWDT TRIGGER

> [!CAUTION]
> **PROBLEM**
> CPU nya laper jir

```
E (34816) task_wdt: Task watchdog got triggered. The following tasks did not reset the watchdog in time:
E (34816) task_wdt:  - IDLE0 (CPU 0)
E (34816) task_wdt: Tasks currently running:
E (34816) task_wdt: CPU 0: Telemetry_Task
E (34816) task_wdt: CPU 1: IDLE1
E (34816) task_wdt: Aborting.

abort() was called at PC 0x400e323d on core 0

Backtrace: 0x40083aad:0x3ffbeccc |<-CORRUPTED

ELF file SHA256: 37ef943e1d7fe57b 
```

> [!TIP]
> SOLUTION

Kasih `vTaskDelay(10 / portTICK_PERIOD_MS);` di dalem nested loop fungsi `sendATCommand` pada file `commHandler.cpp`

## MODUL SIM

- [x] ZERO RESPONSE

> [!CAUTION]
> **PROBLEM**
> Modul nya ga respon

```
Sending Data via 4G...
CMD: AT+HTTPINIT
RSP: 
CMD: AT+HTTPPARA="URL","belum kocak"
RSP: 
CMD: AT+HTTPPARA="CONTENT","application/json"
RSP: 
CMD: AT+HTTPACTION=1
RSP: 
CMD: AT+HTTPTERM
RSP: 
❌ Send Failed
```

> [!TIP]
> **SOLUTION**
> CEK WIRING

TX si modul ke RX si board, and vice versa

---

- [x] ***ERROR RESPONSE***

> [!CAUTION]
> **PROBLEM**
> MODUL NYA RESPON TAPI ERROR

```
+CEREG: 0CMD: AT+CEREG?
RSP: 
+CEREG: 0CMD: 
OK

CMD: AT+CEREG?
RSP: 
+CEREG: 0,4

OK

❌ SIM7600 Init Failed! Check Power/Wiring.
CMD: AT+CEREG?
RSP: 
+CEREG: 0,4

OK

CMD: AT+CEREG?
RSP: 
+CEREG: 0,4

OK

❌ INA219 Not Found!
📡 Sending Data via 4G...
CMD: AT+HTTPINIT
RSP: 
ERROR

CMD: AT+HTTPPARA="URL","belum kocak"
RSP: 
ERROR

CMD: AT+HTTPPARA="CONTENT","application/json"
RSP: 
ERROR

CMD: AT+HTTPACTION=1
RSP: 
ERROR

ERROR

CMD: AT+HTTPTERM
RSP: 
ERROR

❌ Send Failed
```

> [!TIP]
> **SOLUTION**
> ada-ada saja

Belum pasang antena jir

---