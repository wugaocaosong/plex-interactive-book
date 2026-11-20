"""Configure only genius.wuyeni.cn using an existing private Aliyun env file.

Usage: python genius-dns.py /path/to/aliyun.env [--apply]
Never prints credentials or signed request URLs.
"""
import base64
import hashlib
import hmac
import json
import sys
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone

def encode(value):
    return urllib.parse.quote(str(value), safe="-_.~")

def rpc(action, params, env):
    values = dict(Format="JSON", Version="2015-01-09", AccessKeyId=env["ALIYUN_ACCESS_KEY_ID"],
                  SignatureMethod="HMAC-SHA1", Timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                  SignatureVersion="1.0", SignatureNonce=str(uuid.uuid4()), Action=action, **params)
    query = "&".join(encode(k) + "=" + encode(values[k]) for k in sorted(values))
    message = "POST&%2F&" + encode(query)
    signature = base64.b64encode(hmac.new((env["ALIYUN_ACCESS_KEY_SECRET"] + "&").encode(), message.encode(), hashlib.sha1).digest()).decode()
    request = urllib.request.Request("https://alidns.aliyuncs.com/", data=(query + "&Signature=" + encode(signature)).encode())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except Exception as error:
        raise RuntimeError("Aliyun DNS request failed: " + type(error).__name__) from None

if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8-sig") as handle:
        env = dict(line.strip().split("=", 1) for line in handle if line.strip() and not line.lstrip().startswith("#") and "=" in line)
    result = rpc("DescribeDomainRecords", dict(DomainName="wuyeni.cn", RRKeyWord="genius", PageSize=100), env)
    records = [r for r in result.get("DomainRecords", {}).get("Record", []) if r["RR"] == "genius"]
    print(json.dumps([dict(type=r["Type"], value=r["Value"], id=r["RecordId"]) for r in records]))
    if "--apply" in sys.argv:
        if records and not (len(records) == 1 and records[0]["Type"] == "A" and records[0]["Value"] == "47.102.108.137"):
            raise SystemExit("Existing genius records differ; no records changed.")
        if not records:
            created = rpc("AddDomainRecord", dict(DomainName="wuyeni.cn", RR="genius", Type="A", Value="47.102.108.137", TTL=600), env)
            print("Created genius A record: " + created["RecordId"])
        else:
            print("genius A record already matches.")
