package com.atsrs.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class LauncherActivityTest {
    @Test
    public void parsesNormalWebViewVersion() {
        assertEquals(139, LauncherActivity.majorVersion("139.0.7258.94"));
    }

    @Test
    public void rejectsMissingOrMalformedWebViewVersion() {
        assertEquals(0, LauncherActivity.majorVersion(null));
        assertEquals(0, LauncherActivity.majorVersion("unknown"));
        assertEquals(0, LauncherActivity.majorVersion(""));
    }
}
