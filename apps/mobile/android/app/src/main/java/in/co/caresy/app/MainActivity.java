package in.co.caresy.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onResume() {
        super.onResume();
        // Debug builds prompt for a newer App Distribution build; release is a no-op.
        UpdateChecker.check(this);
    }
}
