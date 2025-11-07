class ZeekAdapter:
    """Placeholder adapter to integrate Zeek logs in próximas iteraciones."""

    def stream(self):
        raise NotImplementedError("TODO(zeek): implementar lectura de /var/log/zeek/*.log")

    def parse_event(self, raw: dict):
        raise NotImplementedError("TODO(zeek): mapear evento Zeek -> AlertCreate")
