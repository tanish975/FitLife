package com.tanish.fitlife;

import android.content.Context;
import android.util.AtomicFile;
import org.json.JSONArray;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/** Uses JVM filesystem doubles, not real Android storage or Health Connect. */
public final class StepLedgerTest {
    private static void yes(boolean condition, String text) { if (!condition) throw new AssertionError(text); }
    private static File file(File dir, String uid) throws Exception {
        byte[] hash=MessageDigest.getInstance("SHA-256").digest(uid.getBytes(StandardCharsets.UTF_8));
        StringBuilder name=new StringBuilder(); for(byte x:hash) name.append(String.format("%02x",x&255));
        return new File(dir,"fitlife-steps-"+name+".json");
    }
    private static long count(Context c, String uid) throws Exception { JSONArray rows=StepLedger.phoneRows(c,uid,"a".repeat(32)); return rows.length()==0 ? 0 : rows.getJSONObject(0).getLong("count"); }
    public static void main(String[] args) throws Exception {
        File dir=Files.createTempDirectory("fitlife-ledger-test").toFile(); Context c=new Context(dir);
        AtomicFile.LEGACY=false;
        StepLedger.phoneDay(c,"account-A","2026-11-02",100,true);
        StepLedger.phoneDay(c,"account-A","2026-11-02",25,false);
        yes(count(c,"account-A")==125,"increments retained");
        yes(StepLedger.phoneRows(c,"account-A","a".repeat(32)).getJSONObject(0).getBoolean("partial"),"partial remains true");
        yes(count(c,"account-B")==0,"accounts have separate ledgers");
        StepLedger.setReminder(c,"account-A","water",true,13,15);
        yes(StepLedger.reminders(c,"account-A").getJSONObject("water").getBoolean("enabled"),"reminder saved");
        yes(!StepLedger.reminders(c,"account-B").getJSONObject("water").getBoolean("enabled"),"reminder is account partitioned");
        File base=file(dir,"account-A"), bak=new File(base.getPath()+".bak");
        Files.move(base.toPath(),bak.toPath());
        yes(count(c,"account-A")==125 && base.isFile(),"legacy .bak recovered when base is absent");
        byte[] committed=Files.readAllBytes(base.toPath());
        Files.write(new File(base.getPath()+".new").toPath(),"interrupted".getBytes(StandardCharsets.UTF_8));
        yes(count(c,"account-A")==125,"committed base wins over interrupted .new");
        yes(java.util.Arrays.equals(committed,Files.readAllBytes(base.toPath())),"committed data unchanged");
        File orphan=file(dir,"orphan"), orphanNew=new File(orphan.getPath()+".new");
        Files.write(orphanNew.toPath(),"partial".getBytes(StandardCharsets.UTF_8));
        boolean rejected=false; try { StepLedger.phoneDay(c,"orphan","2026-11-02",1,true); } catch (Exception e) { rejected=true; }
        yes(rejected && orphanNew.isFile() && !orphan.exists(),"orphan staging data is not replaced with an empty ledger");
        File corrupt=file(dir,"corrupt"); Files.write(corrupt.toPath(),"not json".getBytes(StandardCharsets.UTF_8));
        rejected=false; try { StepLedger.phoneDay(c,"corrupt","2026-11-02",5,true); } catch (Exception e) { rejected=true; }
        yes(rejected && new String(Files.readAllBytes(corrupt.toPath()),StandardCharsets.UTF_8).equals("not json"),"corrupt ledger fails closed");
        StepLedger.checkExistingHealthOwner(c,"account-A");
        yes(!new File(dir,"fitlife-health-owner").exists(),"a permission precheck does not bind the device");
        StepLedger.beginHealth(c,"account-A"); yes(StepLedger.healthEnabled(c,"account-A"),"health connection opens");
        StepLedger.endHealth(c,"account-A"); yes(!StepLedger.healthEnabled(c,"account-A"),"health connection closes");
        rejected=false; try { StepLedger.checkExistingHealthOwner(c,"account-B"); } catch (SecurityException e) { rejected=true; }
        yes(rejected,"another account is rejected before a Health permission prompt");
        rejected=false; try { StepLedger.beginHealth(c,"account-B"); } catch (SecurityException e) { rejected=true; }
        yes(rejected && !StepLedger.healthEnabled(c,"account-B"),"another FitLife account cannot claim device Health Connect data");
        StepLedger.beginHealth(c,"account-A"); yes(StepLedger.healthEnabled(c,"account-A"),"original account can reconnect");
        AtomicFile.LEGACY=true;
        StepLedger.phoneDay(c,"legacy","2026-11-02",7,true);
        File legacy=file(dir,"legacy"), legacyBak=new File(legacy.getPath()+".bak");
        Files.move(legacy.toPath(),legacyBak.toPath());
        yes(count(c,"legacy")==7,"legacy write mode recovers .bak");
        List<Thread> threads=new ArrayList<>();
        for (int i=0;i<4;i++) { Thread t=new Thread(() -> { try { for(int j=0;j<12;j++) StepLedger.phoneDay(c,"concurrent","2026-11-02",1,false); } catch(Exception e) { throw new RuntimeException(e); } }); threads.add(t);t.start(); }
        for(Thread t:threads)t.join();
        yes(count(c,"concurrent")==48,"concurrent additions serialized");
        System.out.println("PASS: JVM ledger isolation, interrupted-write recovery, reminders and Health ownership (test doubles).\nNOTE: real Android AtomicFile and Health Connect still need device tests.");
    }
}
