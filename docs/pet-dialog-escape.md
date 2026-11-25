# Pet dialog Escape and focus

A background pet popover must not consume Escape while a native modal is open. Scope its keyboard and open handlers to the active modal. Defer opener focus restoration until the dialog has actually left the DOM, so React Strict Mode effect replay does not focus a background trigger and reopen its popover during dialog mount.

Existing pet Escape/focus tests, nested modal scroll checks and the full current headless Chrome regression validate the change. No business records or permissions are changed.
