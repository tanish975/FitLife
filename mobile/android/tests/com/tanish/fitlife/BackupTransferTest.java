package com.tanish.fitlife;
public final class BackupTransferTest {
    private static void check(boolean condition, String msg) { if (!condition) throw new AssertionError(msg); }
    public static void main(String[] args) {
        BackupTransfer transfer = new BackupTransfer();
        check(!transfer.begin(0), "empty rejected");
        check(!transfer.begin(BackupTransfer.MAX_BYTES + 1), "oversize rejected");
        check(!transfer.append("a"), "no chunk without begin");
        check(transfer.begin(3), "valid begin");
        check(!transfer.begin(3), "concurrent export rejected");
        check(transfer.append("a") && transfer.append("bc"), "chunks accepted");
        check("abc".equals(transfer.finish()), "complete ordered transfer");
        check(transfer.begin(2) && transfer.append("a"), "partial begin");
        check(transfer.finish() == null, "partial rejected");
        check(transfer.begin(1), "begin after error");
        check(!transfer.append("too long"), "overrun rejected");
        check(transfer.begin(2), "begin after overrun");
        check(!transfer.append("é"), "non-ascii rejected");
        check(transfer.begin(1), "begin after invalid character");
        transfer.abort();
        check(transfer.finish() == null, "abort clears buffer");
        System.out.println("PASS: encrypted backup transfer is bounded, ordered and abortable.");
    }
}
