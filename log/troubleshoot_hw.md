# MODUL SIM

- [x] ***ZERO RESPONSE***

> [!CAUTION]
> **PROBLEM**
> *Modul nya ga respon*

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
> *CEK WIRING*
> TX si modul ke RX si board, and vice versa

---

- [x] ***ERROR RESPONSE***

> [!CAUTION]
> **PROBLEM**
> *MODUL NYA RESPON TAPI ERROR*

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
> *ada-ada saja*
> Belum pasang antena jir

---

- [x] ***NO SERVICE***

> [!CAUTION]
> **PROBLEM**
> *NO SERVICE*

```
AT+CPSI?
AT+CPSI?
+CPSI: NO SERVICE,Online

OK
AT+CPSI?
AT+CPSI?
+CPSI: NO SERVICE,Online

OK
AT+CPSI?
AT+CPSI?
+CPSI: NO SERVICE,Online
```
> [!TIP]
> **SOLUTION**
> *sabar*
> Pindah ruangan, atau tunggu sampe modul nya blinking LED yang warna hijau
> (di lab pake kartu by.u sinyal nya jelek)

```
AT+CPSI?
AT+CPSI?
+CPSI: NO SERVICE,Online

OK
AT+CPSI?
AT+CPSI?
+CPSI: NO SERVICE,Online

OK
AT+CPSI?
AT+CPSI?
+CPSI: NO SERVICE,Online

OK
AT+CPSI?
AT+CPSI?
+CPSI: LTE,Online,510-10,0x0830,110132496,22,EUTRAN-BAND40,39092,3,3,-200,-1057,-660,4
```
---