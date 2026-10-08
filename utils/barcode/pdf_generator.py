import os
import argparse
import json
import datetime
import glob
import base64
from io import BytesIO
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Image, Spacer, Paragraph
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

INK = colors.HexColor("#102a43")
MUTED = colors.HexColor("#52616f")
BRAND = colors.HexColor("#23465e")
BRAND_SOFT = colors.HexColor("#eef2f6")
ROW_ALT = colors.HexColor("#f7f9f9")
BORDER = colors.HexColor("#d7dee8")
CONTENT_WIDTH = letter[0] - 1.4 * inch

# Embedded copy of docs-site/static/img/PR-logo.png for standalone/offline use.
DEFAULT_LOGO_PNG = (
    b"iVBORw0KGgoAAAANSUhEUgAAAYQAAADxCAYAAADLJcAVAAAACXBIWXMAAAsTAAALEwEAmpwYAAAxM0lEQVR4Ae2de3Ab15Xmz22A"
    b"D8USBTm2I/khtxJnYsuJRVYyiZ8iOOM8nMda2trsbm3VrMjJpir/CbQTb7amakVu1dbMxBMTmtpKZZP1kNyqmXLKu5GUiaPMqwTZ"
    b"SfxMEX7kMZPEavkRK3ZsQZQcUSTRd+5pNCSSAvqBvg2gge9XBYECGuhGd9/73XPOPecKAqDDyGRzmaVFMo0UDQpBphR0LZGRESRN"
    b"ftvdzKzzcYv/ke6z+ssSko5LSUX1KKXTVCwV8iUCoAMRBECC4c5/eZkGDUGD0jCGVac/SPU7e11YkkRRSPtZ26YCRAJ0ChAEkDjW"
    b"357LGoZxtxRyUN3AWWoDlEVREFIUbds+dOYH+QIBkEAgCKDtqVoBIkV7BIlddMHt066UlAVxkJQ4nH4sf5AASAgQBNC2VC0BEnKU"
    b"2l8E6sHupYK9ZO9/+0f5IgHQxkAQQFvB1oBdplFpiLvbxR2kkaK05X5lNcwQAG0IBAG0BY4Q2MZeZQ3kKLnWQFAskmJm0bBnFwp5"
    b"iwBoEyAIoKV0mRCsBcIA2goIAmgJXS4Ea3GEYf7RByYJgBYCQQBNZ0M2t0tIMUXx5wskDUvFGCYRYwCtAoIAmoayCsyyFNMdGCzW"
    b"Ck9ZXRL2ONxIoNmkCIAmMLBzfK/q6B5SYnA9AU/4HKVI5PquvZXOHX/8KAHQJGAhgFiBVRAZa1HIEVgLoBnAQgCxAatACxllLYz2"
    b"bb353LmXnniCAIgRWAhAO+4Mon3uDCKgCynyhmFPopAeiAsIAtAKu4hsKQ6oPwcJxAFcSCA2DAJAE5dkc4NKDI4QxCBOzF51jvlc"
    b"EwCagYUAtLBh5/geIShP7ZVkZkmSRWeBG4O4sFzJVq+V1XO/eqx1vbCra8Hx2VNGVB6msJ0FdnYIEia1mdBJSaOnH52aJQA0AUEA"
    b"kRnYmVPxAjFBraUkiYpCyEOq0y+mSf+iNU4ZbiUKhk1ZJRLDSiSy1GqkmECGM9AFBAFEosViUFLD5FnboINxCEAQnKxrm3apczBM"
    b"rcq8higATUAQQMO0Sgx4dTIp5GSrRKAeLA7q4KqL+DQXiALQAAQBNEQLxKBEQu43iPLtPu3SmWll00TTrQaIAogIBAGEpslikBgh"
    b"WIsjDESjqqPeQ80SBogCiAAEAYTCnU00Q/GTWCFYywph2EdNALOPQKNAEEBgeO57Soo5ihmOESwJOdZpyVcrXEl7KF5KZSFH3i5g"
    b"DWcQDggCCISbgcxJZybFh2UrIThTyBeog1HB51FRsRZMig9kNIPQoLgd8MWpTSTF4xRnByZo1hBy93wh/3PqcBatJ4rrtt18SLl2"
    b"NilrIa5kNy6Kl1X7+daC9cQCARAACALwpXfrrX+qOuxPUDxwrOC/KSH4cjd1XOq3ls4df+Jg37abTyk1vFm91E/62Syl0X/u+ON/"
    b"RwAEAC4j4AmXsKZKSYo4gFuDmuCOs+X4/GP5uK4h6CAgCKAubkfFQWTt9Yk4cJxSLiKUcq4Qc5XYkhLeIcQTgB9pAqAO7qhVf7E6"
    b"FS84XZgapQSTyc1l+tPpQUH2oBBih3RiAZLPlbliMyV2wlKvc5G9Z8m2Cyf+YqhQ6/tKlc56aGBnLq/iCntJL5keKaaVP26EAPAA"
    b"FgKoSWzJZ0JMzhcemKCEsvmLz2dV8HuPFMTlKRoRy5IQdFAFlA+99pWbDtbaYCCbm4glZwGuI+ADBAFchOu+OEa6SbAYbP7Sc6Oq"
    b"I9c9VdRSwjB54v6bZta+EZMowHUEPMECOeAiypKmSDcJFQO2CLbc99wxJQbTpD/oa/L38vdfcd9zqwrizRfyEySk7hIUjuuIAKgD"
    b"LASwCjdpSm+nIWj/fGEqUesrc4xgXW+KR+jNO25B+bPnypOl/ND5QPtAdnyGK6iSRqQK5p8u5A8SAGuAIIBVDAyPs6vIJH0U549O"
    b"DVGC2JybM0VvKu6s7HpYcrE8ciI/ZFVf2DCcO6J5MR5LxUGGMMMLrAUuI3AeJ5Cs2UeufNa7KUFc9aW5wRaKAeOI0eXqOKovpATx"
    b"ObRIH6ZtG4my2EBzgIUAHGJIjkpcAJPFwBapeKbahqe0LMsjb9w/5BSoiyEnpKSshG2wEsBKYCEAB9smvTX7VUA0SWLAbiIlBpwY"
    b"1g5iwGTS6nj4uPg/Tp6C3iBzBlYCWAssBKDdOpAkZ04fzY9RQnADyDz6Nqn9sM4uloeqgWbNQWZYCWAVsBCAbuvAWhKUqBW73NlE"
    b"JrUn5rq+1Pl8BIMkj+ot0gOsBLAKCALgHIFR0oRMmKtoy73O/P/27hQl5TZ/cS7Lf/JonteMIF0IuZfLmxMABEHoejjvgHS6igr5"
    b"GUoSqRiS8GJAGKnzuSG8gJA61wXSQ8Yu0ygBQBCErkdIfYXUkuYq4nIU1L6uorWY7vE6pASxlaDF9y8NcTcBQBCErobXSCZd5ZaF"
    b"SJSriHFrEyWGlcfrzDqScj9pQBBl12dzWQJdDwShi0lJQ5d1YC2SPUMJwo0dmJQszGosgTEMZ+EiLVaCYYtdBLoeCEJXI7OkAyFm"
    b"E2cdpCmZbpJU6vyUU2e6qCYrQZkJexBcBhCELmXDHTldI+TEWQeMlJTIEbFQx815E9X/a7QSMsvxrNYGEgQEoUsRhqFlhMyzXZJm"
    b"Hbhul6SOhjP96Qsdt04rQWiuqgqSBwSha5FaRshJm1nkYBhZSjBKzFeN5F0rIfr3EuII3Q5KV3Qh62/PZY2UU6oiGlIemn803xad"
    b"iDwwnVnuJw6SZ9VdPahMl4oFIKkoBBXl8vJsz2c+X+CXttz3HNcsSmzn98GNZ4oHbvrJePX3MLpKZNtCjnCeA4GuBBZCF6JGlFo6"
    b"w6/ffe2OxUceHKUWwkKw9P3pKSUGJ9V/J4gFQa5wBylxkESjlE4fWTo8feTs4WlTvWhSglkoKwth1e/hDHE9lhpmG3U3EIQuRHUe"
    b"Oygi12zspc9uz5jKfTG9fHj6WLVjaia8z3I/zXFph4AfyaaF2p6kSQnm1HK6+qfze5a/N71LvcJlsiMHl3XcGyC5QBC6DJ5aqMO1"
    b"cPvWS87/rUbgZg/RkWaKAu+L9ynDzpSqWA+Jnl75ykLvhf+o36M68QNv/Ncdyk0mZykinKSG6afdCwShy1he1jO18JPvHVj1f+6Y"
    b"05IOUJNoSAw6GSUKd2/PFEkDmH7avUAQugwVP8iSBj75exsvflH568898uAExczi4elRiMEalKXwZ3deyVOJI7uNjDIEoVuBIHQZ"
    b"UhiRfcS3bV1f9z0jZezlQC/FiLppI9Ugurr/HCWZgXS55utXXNKz69L+tEVREXoGDSB5QBC6DEEy8ujvthXxg4tQI9Xl/vhGmIuP"
    b"TA9GtQ4G0jYlmWs8BO3zH3pndDEWAoHlLgWC0EW4wUKTInK7lyAopK0n6a0WhiibFJEb1/+OkszV/Yt13/vgle8gDZgILHcnEIQu"
    b"QldA+f1XrPN8Xxrx+ffLUkT+Dds3JFsQtnsI2tCWdVqqnxJiNF0JBKGLECL6dMv3v2sdbexPeW5jkNhIbcz29Wcpydyy6Uzd9y5d"
    b"ly4JDWsulxFY7kogCF2EENEb+daBHmolUkSfRcMuo3qB2XaHj/vmzOm679skT9kkIk8/VfeKSaDrSBPoWKaePpsVkuvnO+semAe+"
    b"9TDNPfNjigJbCH6oGMKzFPCY3JdVJy8s9VyUojw7/vvrCvU+nxJG5M6OO9WPX1aih0+8k5IGH7cXUsqCkLbJPXoULt+yefh/PLU4"
    b"3eh1AskEgtCB7H9qca8kOVHJypXnXz958iRFZevGXt9thCEOUsBjcuHXnOU8hTRG80+ds2TZHhu/5eIOp+euscLS96dLq+oVNcC/"
    b"2/JmIgXhY5d7C8KyNAoqhqPOI0XissvemY1ynUAygcuog5iak5n8U4tHVMebp5jKM2zd6O0yYv81d9oU7ZhMkTKO7H96qWa+gV22"
    b"I9f/v0W5XZKWj8DH62MhFNZ/aqxI5ehutZNvBRo8eF4nkDwgCB3C1ONnTbG0OOe1LOapt6JbCAN93gFl275QdTPIMXkhpT2Rd9wW"
    b"q+ldNPKkIZZwTd9CotZyGN/2muf7y0Rj/GynogeVF84uBN623nUCyQOC0CGIVIobpEkx4znDSNDB3k+NzZDWY5Kj+ScXp1btZvcY"
    b"u4x2UzQmv/0nd0yo77coAbB18NnNb3ptMrnurjGL/+jRs6RmSC6+TiB5QBA6gIrJ7j8K1xFD2FjPQpBUTJ+tjFDDHFMghMwpayO7"
    b"8iV2S0m6sL+QTKrPT/Af0rYb/Y6mMnHdK15vn/89LpEFodTIvVLjOoFkAUFIOOyWUSb7KDWJmhaCsgzS52jEGbnHdEzK2rjIT917"
    b"19iMTNFQ4Hn3ys0kJY2v7DxP/MVQQdeaxHHxuatfrx1MrvF7GGed5RZR6zqB5ABBSDoppxCZSa2hoB4jPZ8Y210VA4rtmGS21uiz"
    b"92NjxfRdY9tca6FQ65OuYEwqC2Zb7yfH8mvf71uyJ9rVdcSuovFtv171mt/vaS21rxNIBph2mnAEOXP6qVnYtj0pDMMqq8636rNu"
    b"2jGlnOUdC7XeYmtBPc24ays7CXjKeij1vE3WKrGqgZUfKm3+8tyIsI0j7bW8prQG15/ZPZAuO7Ozgv6eluNxnUB7A0FIPJr89AHp"
    b"+9TnJvy3iueYBIlh320qnWWBQnLiz4asq740t9sWKSUKbbGiWsmQ9u5v3jdS/CYliyDXCbQnEIQEw756ajJcBdPLRx3zMfl21Gwh"
    b"LPUumcIWzrbp5XQx6Ij61fuHikoURmxhHGitpSAtFgM+nkZ+D18ju3lGY81DIJBIIAhdxKZNmyLPNHrmCzccu/a+aUsIKir30dHe"
    b"T31uhpqHWevFpb/9ZpZS6bvVMe1a5mQpnnjpRsd4Pfrlw9OW+rMgl5dnez7z+QJ5wJ1wa91H0vraDS9OfvpdpT3iD6YPNPh7InfI"
    b"GXWvRMAkkEgQVAahmF9Q/mxBvEjNqIolTKvO6djS4el9ca+S5rJqZHz28LSp9n2E0ukj6phy9RbO4df5eHk7Pl7+nMc+HPdR36I9"
    b"1OzZR9vXnz347B3PlT69uTQd5fcstX6E3t4xDlAXCEKCGb9lnRVm+751/RSVl0+tXpzF7bQmyv00xx1T2GMKx4Uqnsvfm96VFjSn"
    b"/sxSCPh41SDbETGv7TjQ/Nr9O3JU5gS4uGcgSeu/v/vl/d//8E+zm9LLoSrS1vo9YlmDhXBpFAsherVV0BogCIlHFIJuuenSSykq"
    b"p87VXn6y2jEtH/6rPWGOKSQW/8P7kIIORCxwN+EnCsxrX73p4Gtf2bFNSp7WqlsYpMXf+/LIjyf+y7Wv79X1e0S65S4bi0AigSAk"
    b"HCnLR4Nu298f3UJ4/nXvxWUkiZnrFo9THMhyeZbjBbwP0kMgUWBO3H/TDAsDlcu7JclZatwtwslkM9Iuj/D3vbzzSUv37xF2dEGI"
    b"EkPg60QgkSConHR6+/O0tLiXAviNIwYKHV4uLfpukz3zVPblTZvpnPAvlR0C6wulhyyh/OaaJ9BwJ3p0ZYVWL1776tBB9cQP2vzF"
    b"uSwZRlYQL0ovTTcIff46qOO0BEklAKIopHxWkl1cWKZiSbmj+H12sQmiad2/54NXXmL9+LVoy4RuavxesVAOO7lAEBLO+JAoTT15"
    b"dr8Qhu9Id5MGQXjhdf8qmH1ykW5a+Gd6et0HSBeqM53sIdon45nBwueuQCFxyl5ESMCK6/ecs1mcorH5qi3UCHydCCQWuIw6AbYS"
    b"iHwDeZuvupKi8pIKKp9a8F9+csfZf6YB+4yW2SbKRbP/C28+VHBm1sRDVlkJWWoibB3E8Xv42rzwm+hrRq/r918Zby18ncY/vG6G"
    b"QGKBIHQAbCXIss3loC2v7XS4jJgXXvfvcNhK+Pj8YwcpcoBRFKmnbyIVcjZR6L0Q7aEmEtfvef716GLAbL4y7OChcp0IJBoIQofA"
    b"0z2VKIyQRwfcv65fi9vo+d8EWzzlXeWTWb9j8kTSQdnTM8KCJyTdTTEiBe2iJhLX7/nhS29TVHjg0B9mivKK60Qg0UAQOggWhdyH"
    b"+7ZJWd+Pq8Nt9L1fnAq0HfvHcyceKvkdUw1K0pbjuY/07V7RyZgUJ5Iy8pH/cy01D5NiQIcgbAkeP6h1nUCCgSB0IOMfWTehRubb"
    b"eAH0tTkB5ru3UVReUBZCkDiCQ295o98xuZT4dWmXx2VP77bxm/tXl3UWFCphqxHeppQen1oQYvo9P3zpDEXlVKk02/B1AokGs4w6"
    b"FDdjeMZ9nC86N/fMM9wRHaAInDpXduIIt21d77vtspFiBTrudUzU319qhxFmnxE8MezyL70wmJblLBmCrQpTPfi8Zmj19F/uPC2S"
    b"sqQEoEi2PL4sUoU37n9/LJm83/uXedLBK6++OuNOHZ3h/7fbdQLxAUHoEqolJTLZXMkJoUbkkV/MBxKEIMeUBDK5uUx/Oj1oCLmn"
    b"Em+wMyR8z6MSBznonm4WD9XgbNpy33Ole3/2Jn3sspP08cuDud+CENSV50d6zYy1JF0nEA24jLoMLl0tSRYoIg89dzK42yjBsBBc"
    b"ed/z+9b1po4JQx5RYjBK0YvHZR4+8U76/AvX0a2Pf4Du/ZlJryxET+LTET9QcZ9CK5fgBK0FFkKHMvX02axB6WEpebEaWXVnOHzn"
    b"/x0oPfPkkxSFMG6jIMdEzkwkYUkqz1KZCq0elbIQvKMvNSUljcoYV6RjIWBx4MdnN7/pLJd5db9/Nvha2F300qnwn1uLkPRskq4T"
    b"0Et03wFoK7gxC8kLnddftezYr16k6a9/g6Jy29ZL6Dv/6T1+m438r8v+I/kd08WIGVkuT1Y7nKXD0/H1yhcY4RIWbBEoEchRC8pI"
    b"D6TL9Lmrf6OE4bVQn/ujb1taYgh/9Lkx673Xv88M/onV1wkkG7iMOoSpOZnJP3nugJC8sIt3x7vtPe8ON8+8Duyi8HIbnRM99Neb"
    b"Pj0V5JguRo6KlHFs/9NLgYrP6eC7b2TMLfc9P6fEYIJatKbA/HKKpqwrHVdSUDcSlyTXIQb969ZRODFgmn+dQHxAEDoAngUilhbn"
    b"KERy1Q033kg6+Pozv635+mnjEvpW5pNUMgYiTa+U0p7IP7U4x98XJ+yy+fLPzWnXRdJyWAw+8fR2evDlK3y3/fMf/IZ0cP2N26lR"
    b"qtepFcu6An1AEBKOIwYpHoGHS3Qa/NAHSQf/++nfXmQlcOd9YOOdpK8Tl4P8fWxxxMGUtcUJ7PLovJ3g45n85TU0dax+ohhbBzqC"
    b"ycwN729cECrIQb4X2VolkEggCAmmUTFgtlx5pRa3EQeXV1oJ+sXgwvce3jBMupn8xdWqw42evR0n7EKa/MU1Nd/7m+dPagkmc7kK"
    b"TVajslaXIuW5gNYBQUgwSgzYb2tSA7AYDH1Qv5Xw1Ds+QHG5d17tuYKe638f6YLF4MFX3kVJ4MFXrrhIFNg6eEgJgg5MFVfSh8xO"
    b"PbGQI5A4IAgJhWcTUcTyyde/X08coWolcIf98z6dHcvFsODocB2xmygpYlCFRWGl+0iXdcDcesdtpBNhiH1wHSUPCEJCqUzjjAbP"
    b"NtI1MmQr4bvn4hUDhldhe7b/eopCpWNtbzdRPdh9xAFwtg6+oimYvPnKLQ2Uu/YlQ4uwEpIGBCGBVGZyhJ3GWZsbbowaSKzAVsI3"
    b"/v8/UjN4bl3jbiOevZNUMajCrqM/KfyWdHHLHbdTHAhh7CWQKCAISURIbbX7hz70IS3BZcb61YtO0lvcsJXwatp/OmYt/v3c+9pu"
    b"NlFY3nrtRXrkZ3oEgYPJQ5pmnNX6ejV4yRJIDBCEBCKMtLbFVVgMbrld3wjxwLcepoWzwRbQicKLfdeE/YgTN9BRM6iVyHNnaOlV"
    b"fcVSh34/NjGokBJNXXgIRAOCkEhskzTCLgNdVkLp5En63nf+luJmkcIFllkIHnw5WUHkWiy+Okf2uehrHjAxWwcOgoyNBBIDitsl"
    b"EmGSRqpWwpF/0BMDKD7zY2fVLZ2Wx1reTG3iipyBh8r/81dXDypXUaJnvSyf+Aktv/FL0gVbB7rW2fbAJJAYIAjAga2Ex3/wA23u"
    b"niN//090w/YbKXNpPB3OGz2XFnvuGhsJsu3m3JwpelPHKMGwq2hRo6uoGdYBSB5wGQEH3bGEhbNn6a++/o2mxBP8MPpSiS68xmKw"
    b"8LPDJJf15BwwTbIOQMKAIIDzsJWgs5PgeMLfzP5fajVSUpYSzMK//JO2uAHD13jko3cSAGuBIIDzsJVw17/5DOmEp6J++1sPU6vY"
    b"cu9zPMvFpISyePxJsn/3Fulk5GMQA1AbCAJYBVe81FvXphJk1hWwDotIk7Ypus1m6ZU5WjrxU9LJ9er6InYA6gFBABfxb//DZ7VN"
    b"Q61y5O//sSWioNxFiZwHz2KgM4hc5ZOaLUDQWUAQwEVUfMwfJd00WxSuys2tXQ84EcQlBiTEJALJwAsIAqjJLXfcpt11xLAoHG5C"
    b"4hpjp40sJYxzLz4WjxiocM584YEJAsADCAKoSxyuI+bxx35IX5v6Syq9paeWf11EcoLJPKWUp5bqTDxbQWlRyEA5G6C7gSCAusTl"
    b"OmJO/PrXTp5CvKJg7KAE4OQZvHCIyvMnKBaEnFwo5C0CwAcIAvCEXUe33K538ZQqnKfwtfxfOhnSsSDaP37A5SjOKjHQmWewCkH7"
    b"5wv5PAEQAAgC8GX4zj9kp3Ysjm3OaD586LtOroJ+a0Ga1Kawi4jjBeeOP6U1A3kNlkFyggAICAQB+PKOSy4pGULuVn9aFBOcq8Au"
    b"pDn1rJG2tBDK8685LqKY4gVVLI4blAr5EgEQEAgCCITqWKxyRRRi62DYhcTrKcRjLbSeak2ihZ99Pz4XkQtfK8QNQFggCCAwbxfy"
    b"RSnkOMUMWwsP/OmfOzkLnSAM7BJaenXOiRXEFjheuT8hx/haEQAhgSCAUJwu5Gd41go1Ac5ZYDdSUoXhvBA8+zAtvlKMM1ZwASEm"
    b"nWsEQANgPQQQmvlCfmIgm+OhaOxlpdmNxMIw9/SPnUS5P/jonbGtsaAL7viXf/MTpw5RU0TApefqIXrzr//zBAHQIBAE0BDNFAWG"
    b"hYFdSfzgAm3Xb9/eVgFj7vjt373prHfcDLfQWlgMeq8aJACiAEFIIJLkfkFiLzUJKctHa73ebFGo8vMXfsqPwYHh8WOSRIFs+9Dp"
    b"x/IHqclURWD55EtU/u0vm2oNrCSMGLTLvQPaE0EARESJwkSzRaEWkqggpDxq21RIp6m47sN/rDXwUBUAXp+grESAn1slAlXWisFr"
    b"X7kJbRo0DG4eEJlMNmfaUrTdmsXGOy4lo289CX7uV8/8d6qXSD1Eqo9EunfV9ty5y/I5ovJiZVqoei6//RaR+ps7/7inioaBj713"
    b"60coffl1q16HIIAowGUEImNLY58zPm8znE6cVxtTo/lOgoWt//f+0BE8AHQCQQCR2JDNjSpH8SiBpsAi0MdioEQBAN1AEEAkRBvE"
    b"DrqF9OYbnXjBWlcXALqAIICGqVgHyV3APimwAPRcNUQ9m7cTAHECQQAN4QaSYR3EjLFhM/W95w64iEBTgCCAhnADySaBWIBVAFoB"
    b"BAGEpmIdIJAcF7AKQKuAIIDQlCVNY7K7fng6qZNbcOlWAqAVQBBAKDiQLKTIEtAGu4fS77rRcQ9hBhFoJRAEEApMM9UHhAC0GxAE"
    b"EJiBnTkWA5PioajU5hBJsSfGfbQFEALQrsAVDALhTjOdo5jWKV4Uclt1yUfXLcUVOTuqnjMHi9OXXkvpy66LTQhQywhEARYCCIQ7"
    b"zTQWMZAkZ1au/+uu+DVzSTY3mLIpR0IMU0KtBu74U++8zhGC1MBmAqCdwWgC+BJzNVNLWQcjfgvCK6thl7BplxKHuykmK0UXjghk"
    b"tlL68vc6tYea6RaChQCiAAsB+KLE4AjFhRCzC4Upy28zZTXwAjjOIjjrs7msocRBCtohqD1mPLE7iDt/WAIgyWA0ATxx/fnTFA/W"
    b"/NGpbRQBZb1kllWsQQlE1hUIjjuYFCOcL8Cdf2pgS2XNhSZbAV7AQgBRgIUA6sKdbZz1iqSQkxSRUiFfUk8F9+FQFYl1773ziP32"
    b"myR5gRt3cRu56D7XWexGuNnBvJBOdUEdRwD6N1Q6/t71mBkEOhYIAqiLbdNeZUOaFAOSxMHThakZioGqSGz48B8TbULWLwBBMQiA"
    b"GnAgWfn3JygmloQ9TgCAtgKCAGpSmWYaD2unmQIA2gMIAriI9bfnsqrbHqV4sJYERY4dAAD0A0EAF2GkYptV5ASSYR0A0J5AEMAq"
    b"nGUx45u2ablZyACANgSCAM7DgWQR7zRTBJIBaGMgCOA8tm1wQTmTYoADyW62MQCgTYEgAIfKNFOZo5hAIBmA9geCABzinGZKQiCQ"
    b"DEACgCAAN5Ac3zRTg+w8AQDaHggCoJgDyZNuKQkAQJsDQehyBnaOxxZIJkwzBSBRQBC6mEogmWILJPPCN9RauswykRYBEAEIQhfj"
    b"BpJNioF2qFckZXm8izrJkpQCM7lAJLCYRpcS87KYJWUdDGFmEQDJAhZCl1KWFFu9IhJiP8QAgOQBC6ELafdlMQEArQEWQhci2nxZ"
    b"TABAa4AgdBkDO3MxBpKpgGmmACQXCEIX4S6LGWO9IjlGAIDEAkHoImybRtVThmIAy2ICkHwgCN2FSfGAZTEB6AAgCN1FPJm7QmKa"
    b"KQAdAAShizAMiqPqqDVfyKOaKQAdAAShiyipUbzUHPjFNFMAOgcIQpfB00INIbeRlLMUEXdZzBkCAHQEyFTuYjZkc7uEFFPUYLB5"
    b"UQkLYgcAdA4QBFAtZREuYU3Q/vnCVGw5DQCA5gOXEai6kUZCuJGsRZIIJAPQYcBCAKvgbOaypClBYle9bTgwjdgBAJ0HBAHUpK4b"
    b"SdCschWNEgCg44AgAE9YGEjSsJB0yjbo4JlCvkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    b"AAAAAAAAAAAAdUlM+euNw+PHpNcSj1JOzj+anyAAQFcxMDwuvd6Xthw7/RgWdAoCltAEAADgkF77wobh3DRpQEijRGSfkpKKdpms"
    b"t3+ULxIACSOTzWV4SVHSgJB0nCSVbNUm0mkqlgr5EgHQRlwkCILEKOlAyMq3KadUynDMOkuSKCwJe3KhkLcIgGSQ0dcmKg82y5Uo"
    b"qMHXeEH9MbuUogLaBGgHmukyMgXJ0V4pjm0Yvme6P5szCYAuRmlDVhhimtvEwM57ptgaIQBaSEtiCFVhGLgjlyMAAFvUOVuKuUuy"
    b"uUECoEW0NqhsiCk1MtpHAADGTElxBKIAWkXrZxkJOQFRAOA8GRYFuFRBK2iPaadKFNZnc1kCADCZHim0zPYDIAxpCk/RFnLcbyOl"
    b"NINkq4cQeygAhmoAKqg2hKl4IGkIKY+WDZrw3IZnK9m0S7WHYfJKsLywfXbDHbldpx/LHyQAmkRoQZBEpTOFfCHAps42qpOfUMGy"
    b"I+TfCEy7TKPqOU8AJAhb0LGAbeIgzySyiXIkhb+b1BB7+TMEQJOI3WWkRvyWIeSQ+tM3MU0a4m4CoINhC3i+kJ8gKff7bctWAqai"
    b"gmbSiMsoNNwIVIxg3KhYCnWpNgCdbiP+vqVFMoVB5xtWs7JE+2/OmWpf5srXWpmhuvZcSJtKPb1kxX08fB5Sap8rr8HyMlkLT3Rv"
    b"MpahXEy2JHanenb4y+x6da3tRuBrvrBAmXa6D5m1baMb7odafRG3wVZUcVh7LNX7oSmCwLBJvWE4VxAksl7blcvKz0o0QxFh/yub"
    b"3KrRZVM9q9/jLNGB4fGiMtsLi4a9X1eWqOMOsI29UsisqDTkixq7u28na1uW7dkzPwjkajiP+l2j6nfVj8vYcv9Kv3P1mJSje1Tt"
    b"21x1LlKrM2Z1FQBz9qncf2zx1TsPvWrfvcPjJcmWYxdm63LjG9iZm1Uxhb1e24myf7xhLetvz2UNw7hbXfNdfM17+y7exr0PS3wf"
    b"km0fauTaq/vGY4AnSqePPrB77XGJlNhX655w74eWVTNQ96xZlsaU6qJ9LDJRSgl7LKiYVn4z7eF+76L2x6Sc68Cu+Iaz1ivlhoRZ"
    b"7/2lJWN04UdfPX7heMS+tf0i3w/9t95rNk0QGBVUO6ScVFnPbUT4BrCSyoUV02xt+GyqAt5ysFeKXO/OeybmH31gkhrfJ3e66iTL"
    b"HJfsCFBC1snaVhdmlMWhLOTutwvBRgnu+cnW34COkut35um86pgmKmVEPL6Tv88QWXUs+xaFHGm0MVbFxzkPbBEE+Eh1373qEHuG"
    b"75npptIm0qCiz6UJ1R42ZHO7RCU2MehE+/xR51/ywGkXX3s1QJoJ0w6829iF/XNehfIOTAVok9VqBqNR22RYVJzzgNq3b/6HDCgG"
    b"jiinnJliJgVgZTvg326ogWpQ0TGU2MgA+1EDkH3qhprw/q4mog7a8t9KNOwz5QbB2Z4Bbrw1u2w8F8Ld5zHONKXG4GSkOX25GCLD"
    b"HbNq4HP8uygcZm+D2bL8GT737j4buoZuZ3CEzyl1A2XS4rLh682jdSUGB6gy+m4E02kHw+PHdOVAOMe1c3wP51U00ia5xA01AS4b"
    b"QkHOmxCTpwvellTlWtxzQIlBkIk0dfYjeSLOnK7rkO4tbwsiBkxzBUH6NwDlbtlIDSCFscNtEI0JCjeGkKU0+CRH2ufa/WsQBSnE"
    b"te6srkY7Bk6MOhAmmMlikJIRGsBqTD6nSFZ08WkzbBE3NAiqDw8KtCTGsbWoLJwZijBAiLu8TaWjDDCYU2IwX3hgwmuTC9dC6hjQ"
    b"aLsOhm0MBxGD/t7yqaYKgro5fG8Mp0RwI9+t4yIYYl/QjnBg5/jeICc5FBpEQZ2HLDUuBlVM1ZgDNURuBK4YRBfFlfAIUY0uqYMR"
    b"AQRUpupb1Y6LTp8Qr8TUkhjXuNV8gRBtMiyB27Cg2QBiEMe10CMKAT0F7KJqtiBkfTeSeszoBskE6Qi5E1Q3yQTFQfSsbT2NR8i9"
    b"fpu4IyL9YlA9BEH5Ti7hoGIIvtOsUx5uVo5bUfAOSAVsZUE9B2pfbHFoqB6g477IuPlJWnHcoiJQzlPRIH9hC3ktwmA2M2u9qUFl"
    b"1cJ9G4Cd8s9X8IMj9kLIQ9K9+VUw23T3HSBoJIf9tilL4qC1782+4jgsqmSqDrrHYXp9zg0MFig6JeWnm+XgpfO9fMzBs8cz3CF4"
    b"JVzZkhuBNMmHNdejxCNj5T6822/GGbklHBaIRqjDuOTW3GCA389Tgmu2h4oYB3F1yEk16suvDFC6Qu4bb9B4H9Zrk3wfmr6freQn"
    b"Bem8A7Hi9/thLQq5e8EnuMsB5IDW0Mr2WG0Hw+o+8PRuVMU5YPJjJJomCI6vLsDFT1MkQbBsIcfqnLiJgWxuwi9D1C8XgqezBmnI"
    b"HseRU+ci7zXdUMsNIGi/GtlMlI5e/DuCZo8b5fpz4N0OaZR8j0OOq0BcrcacV8HjUdXpcECvrrg2szE0i6Adkjuir0mZ11IgH9S5"
    b"n69x7jlZVB3DiF+sya8tBERHm4zqAj3PCqvW9NnUCjrjTgWQ/VfUq98e824M7oDXMekUZ6qIMluMFrltT/VpJj83xWUU1FenDnAm"
    b"ws3nXECvjoMzRL0aWZVlrxvQIF9Xiu9xPJrP+R2HYYvGYyJOAGwqV+9ccofAjdTva9RIZke99yrWQZDjyNcd2fGMDRmgLpYIUuYh"
    b"ATizv5ypwGKOAgyOlgTVn3YpDT9r2/I693xvqHPvmy1djhasLmlqk5n+W++9ljRg+3S8LqVyxTKwfLarWAc+gsX9mld75Cnnfu2R"
    b"xTnqOWArTe1nZP7o1Cb1GDp9NL9bPUb4of6/jbeJxUKoZqamUpR1zb1skM9JFbyhRlGm2MJR/wuo9jGpAtdZr23qJQO5o4us12f5"
    b"4ge5kXyPQzhZrI0E5Up+ATCGG+lGJxHIq3EIj/ec4LUXVpDjYFHYMJzb42V1VRtDNbmm3eBj91uLXG0zyIlJSt2C+dWVmC4Upqy6"
    b"b0v7uLqHCvXfN3wt7RR3ED7bNJIYdx5bTi48FiCnhNu9T5vs6S0PKddhpOtfmV4aJNdAjgXNCzJSxh6/nA9PYXcJkrjbmyrvXmjU"
    b"dabO8enC1KjfZqEFgRvnwPC4DLF9ILgjbZKPrOjbCOokAwUx01PKNKQABOiQOZ9gsFQIndYe2MKySRSFRwyg3iwYd1RU93OMalS+"
    b"jeDCtv4iXa8xODkL0j8464W6ZuMR3SKmtnWXKxT9xJStTIoIW4qcJeuJaDwwLAPei6o9FlN+G5WjBajDTC9VHedBCozPwEjKQ0EG"
    b"qpV9+whjZVJOI4KgBmf+YsA0N6hcHyuIiurAKRkw7OulqI1jpntqoRWmA5dSHlU3oFnv/XLFhx8lpuKJGmWeYvULi2H4W3ypEFU6"
    b"WRy5jAJ5BerrNAY3UD9KEVhYNCaIWjq7bSVFQ5n11EX0qHPvN0iLghDGDl25BitxZipJn4GREbwd+FpsQuygBgjiJq/SDoJgRSmX"
    b"0EyE34waKZ8lnfuLWMYjLpwkQG9hDF04jWvYeOaSNNgYEkU18Kix6FytwoJdRyAx8M81WIvB7jSfKGxK74DOpJhptSAUFwMGb9oE"
    b"b/+jEMOc+k/B8WykypWiJZCmHzvj6QyUMrSvV1krz6rz5xVIN6lD4WAfu9h0uEzdwnbDXgUWwcUEyTVYixqw+cYjOIgd1CNhB3DE"
    b"xx1La5UglFQPsN+pC58QKpmI/ptRFzRAg4TpUy7PopAo09ryK/TWzoHlCJRSalAU1Spwp/DyDDinsF14R2B34yaWhfUlB2nrJiWI"
    b"Zhe3KziJMkJuS5IYuGCkFRjZLv74JJBxO6PGPpzNmW5hO57l5DtiBXVQbqUGMrM7rk9oxEIoqSBFUL8Yj/qO8+iPg4xYLxl0Il5r"
    b"KotKsb5pny/I9WdzodflqCZZiQ52pzUTrOve2JrKRU5kIADqIpo2cpp/1LE0J6iF+K2p7JdnwfRIY98CkW+y4Kr9Bi+m5tQxqlk4"
    b"UnRG0p8mzAZdRx1Du0w77RSq6eBaUEErrbOWmkUjJcwrtW28t0lq/CBQMiTJUeWymA0aWOaYgd+UR/IuG+HgLIwDLlBxHR3SlRMV"
    b"ZspnELhE9QLFBwQhIG4Sj/dceUmHTmtIGGp3/BLavDOc6+JnVSTWjA+6fGyYejUBynkkZjp3E+HJLLMkvZctDew6klR0KwrUJSVo"
    b"d5JcUE0NKncAltebaiTY+XPlqVI2wfP9RoKbQgx7vS1jTNBrBjJA4mXQktPuinYmee5Pds1SpAHh+kQj8wX/OmJ0wXXkSZAVIJcT"
    b"FuiHIISBM4s9CNqgk46UvqPYTJjzkKmseeBTijmZ7rMqbCUEcR8EKeRnBKgvFCZTvAtwxKBan0iN2jlW4z1qDzDrKJXyt+aSVpgR"
    b"ghACO0AaeqM3AI/6krIYTLCGYOyhgASpqGkbMvEdnC4rIcisIszoW4EtJ1cWq2P3rxrV+NYcc11HdV2ZTsVYH5GPMkjkUvvUZCAI"
    b"IXADTZ4NzSn+F3Id2OqaxLxcXlzLBeokWEOQo65rwxO2DoL4wzthPQSdVoIfQUolO4HpLqBWkT13dpqfG9LXdSRsOkQ++AlLLQaG"
    b"75kWhjgQ95rSa4EghCXAyIIMMRVkbeRqffwVaxI788qTIApBRru86IeX1eOuQ+tbnz5M5dR2R4eVIFP+AfbetHcpBhbrTllnolHs"
    b"AGtx+LmOjBTNkP+EB27Xc0E8AFx6hBMN1VUerexATDVzbXEIQkgMw6m4afluKOQE1zVSZt8oL5dYfZk7Qb7o7kIpx9wFsFcKwGBZ"
    b"GtPU5gQc7fIi4XNch37lOeCCa+d/v3/QzVrSt1JUywlqJRgeyWypIOdDdWS1BiVrBiEmdTGO1RnRdeS45oINWLgtHNugRv7c/ld+"
    b"H7cH7idYCIyUk2iYXflBIWgmiLWtA0w7DQnfAGrEMGZUGpQfpjL7plOGM9/beYHrIRlO8ff6hXu46iffOKePPhAqUanZ2ILGU5Lm"
    b"fDbLcOeU6hG51UW+AlTyos6cLcNBTXUf+BVBdDqJ04/lZ9a+wT7wINNY3UFJrjpDi9fUVvsdJBHs3Ltf0vbWahTUAG/CrqynYXps"
    b"5pmwxivTqesRZI1wx5UqUmKU+4EwZfhZwJUojLwdfn2UUMBCaABnZBGzG0ONCto+Ccu5OYOY3Y0iaD+vqEYdhhvUnPXbTg0m9tV1"
    b"HwZfXTAjKgs7ZamBKZCNJBkmCR7gBVlO1s915M5csig+SuUm5OJAEBrEKc4XlyiEXKijlTjr9sZxHpz69FNNDag1E8MIVG6DR6Y1"
    b"z4GzHjXFP/OKl/6kDieE6+iAh+vIchc2skg/TUsyhCBEwBUFHiHrUm72R44nRQyqaBdHZRkEXfIvqQS1EtR53VuvE3JHpVFcCFYA"
    b"UTGTMMkhKq5A+7XjjFd8ryoKOstVcIXoZmacQxAiwiNkdRMMBWrcHrgXfsgZcScQFgUua07RRkiWclHs7mTLYCUBrYRMPSuB3R3z"
    b"R6eGAs18WwPfb859a/u6njJJy7ZtBGcqdQDXkRPfy9bPD2BR4OKf7ndZFOGQeHB4+uhUU8uPQBA0wDfB/KP5UadDrAiDFfSjajQx"
    b"o3yYI82+8HHgnIejU9u4Uw/jznDXyRjnDkq5QhKfgBaUoAlSXlYCo+693Ip7zxN3dbYxvt+4E3STDD1HxoZNXSHQfO8FzBPxzStg"
    b"l57bFsbCWAxr1oxp+uBQEIgFniZm8Cwju7KMoRS0UUg6RSwCBlm2MvXjnjHQDnAgzuARpu2cAydZyinDbLAYOutkFJBVqw/uqDjz"
    b"e81955xv9XqhG+65doSvC1taaAsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOgU/hXe8NXMygQFHgAAAABJRU5ErkJggg=="
)

def readable_file(path):
    if not os.path.isfile(path):
        raise argparse.ArgumentTypeError(f"File not found: {path}")
    if not os.access(path, os.R_OK):
        raise argparse.ArgumentTypeError(f"File is not readable: {path}")
    return path

def expand_files(paths, extension, label):
    expanded = []
    for path in paths:
        matches = sorted(glob.glob(path))
        expanded.extend(matches if matches else [path])

    missing = [path for path in expanded if not os.path.isfile(path)]
    if missing:
        raise FileNotFoundError(f"{label} file not found: {missing[0]}")

    wrong_ext = [path for path in expanded if not path.lower().endswith(extension)]
    if wrong_ext:
        raise ValueError(f"{label} file must end with {extension}: {wrong_ext[0]}")

    return expanded

def flatten_json(y):
    out = {}

    def flatten(x, name=''):
        if isinstance(x, dict):
            for a in x:
                if a in ['id', 'id_from_qr'] and name == '':  # Special handling for 'id' and 'id_from_qr'
                    out[a] = x[a]
                else:
                    flatten(x[a], name + a + '_')
        elif isinstance(x, list):
            for i, a in enumerate(x):
                flatten(a, f"[Item:{i}]  {name}")  # Updated line
        else:
            out[name[:-1]] = x

    flatten(y)
    return out

def display_label(value):
    return str(value).strip()

def paragraph(text, style):
    return Paragraph(escape(str(text)), style)

def get_report_styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(
        name="ReportTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=21,
        leading=25,
        alignment=0,
        textColor=INK,
        spaceAfter=4,
    ))
    base.add(ParagraphStyle(
        name="ReportSubtitle",
        parent=base["Normal"],
        fontSize=9,
        leading=12,
        textColor=MUTED,
    ))
    base.add(ParagraphStyle(
        name="SectionTitle",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=BRAND,
        spaceBefore=8,
        spaceAfter=6,
        keepWithNext=False,
    ))
    base.add(ParagraphStyle(
        name="TableKey",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        name="TableValue",
        parent=base["Normal"],
        fontSize=8,
        leading=10,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        name="Badge",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=BRAND,
    ))
    return base

def create_tables_for_term(data, term, display_data=None):
    value = data.get(term, {})
    styles = get_report_styles()
    headers = ['Field', 'Value', 'Label hint'] if display_data is not None else ['Field', 'Value']
    rows = [[paragraph(display_label(term), styles["SectionTitle"])] + [''] * (len(headers) - 1),
            [paragraph(header, styles['TableKey']) for header in headers]]
    groups = []
    items = value if isinstance(value, list) else [value]
    display_value = display_data.get(term, {}) if display_data is not None else value
    display_items = display_value if isinstance(display_value, list) else [display_value]
    for index, item in enumerate(items):
        flattened = flatten_json(item) if isinstance(item, (dict, list)) else {term: item}
        display_item = display_items[index]
        display_flat = flatten_json(display_item) if isinstance(display_item, (dict, list)) else {term: display_item}
        if not flattened:
            continue
        if isinstance(value, list):
            groups.append(len(rows))
            rows.append([paragraph(f"Item {index + 1}", styles["Badge"])] + [''] * (len(headers) - 1))
        for key, field_value in sorted(flattened.items()):
            row = [paragraph(display_label(key), styles["TableKey"]),
                   paragraph(field_value, styles["TableValue"])]
            if display_data is not None:
                label_key = 'label' if key == 'id' else key[:-2] + 'label' if key.endswith('_id') else None
                hint = display_flat.get(label_key, '') if label_key and not flattened.get(label_key) else ''
                row.append(paragraph(hint, styles['TableValue']))
            rows.append(row)
    if len(rows) == 2:
        return []
    widths = [.40, .25, .35] if display_data is not None else [.46, .54]
    table = Table(rows, colWidths=[CONTENT_WIDTH * width for width in widths],
                  hAlign="LEFT", repeatRows=2, splitInRow=1)
    table.setStyle(TableStyle([
        ("SPAN", (0, 0), (-1, 0)),
        ("BACKGROUND", (0, 0), (-1, 1), colors.white),
        ("LINEBELOW", (0, 1), (-1, 1), 0.8, BRAND),
        ("LINEBELOW", (0, 2), (-1, -1), 0.25, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 2), (-1, -1), [colors.white, ROW_ALT]),
        *[("BACKGROUND", (0, row), (-1, row), BRAND_SOFT) for row in groups],
        *[("SPAN", (0, row), (-1, row)) for row in groups],
        *[("NOSPLIT", (0, row), (-1, row + 1)) for row in groups],
    ]))
    return [table]

def build_header(qr_code_file, logo_path, obj, data_type, styles):
    qr_code_img = Image(qr_code_file, width=1.15 * inch, height=1.15 * inch)
    qr_code_img.hAlign = "RIGHT"

    id_value = obj.get("id_from_qr", obj.get("id", "Unknown"))
    title_block = [
        paragraph("PHENO-RANKER / RESEARCH RECORD", styles["Badge"]),
        Spacer(1, 9),
        paragraph("Phenotype profile", styles["ReportTitle"]),
        paragraph(f"QR record: {id_value}", styles["ReportSubtitle"]),
        paragraph("Descriptive research report | No diagnostic interpretation", styles["ReportSubtitle"]),
    ]

    logo_img = Image(logo_path if logo_path is not None else BytesIO(base64.b64decode(DEFAULT_LOGO_PNG)))
    logo_aspect_ratio = logo_img.imageWidth / logo_img.imageHeight
    logo_img.drawHeight = min(0.55 * inch, 1.4 * inch / logo_aspect_ratio)
    logo_img.drawWidth = logo_img.drawHeight * logo_aspect_ratio
    logo_img.hAlign = "LEFT"
    title_block.insert(0, logo_img)
    title_block.insert(1, Spacer(1, 8))

    header = Table(
        [[title_block, qr_code_img]],
        colWidths=[CONTENT_WIDTH - 1.35 * inch, 1.35 * inch],
        hAlign="LEFT",
    )
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("LINEABOVE", (0, 0), (-1, 0), 2, BRAND),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    return header

def build_metadata_table(obj, data_type, styles, test=False):
    generated_on = "not shown" if test else datetime.datetime.now().strftime("%Y-%m-%d")
    rows = [[
        paragraph("Data type", styles["Badge"]),
        paragraph(data_type.upper(), styles["TableValue"]),
        paragraph("Source ID", styles["Badge"]),
        paragraph(obj.get("id", obj.get("id_from_qr", "Unknown")), styles["TableValue"]),
        paragraph("Generated", styles["Badge"]),
        paragraph(generated_on, styles["TableValue"]),
    ]]
    table = Table(rows, colWidths=[0.7 * inch, 0.55 * inch, 0.75 * inch, 2.8 * inch, 0.9 * inch, 1.4 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_SOFT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table

def record_format(obj, fallback):
    """Prefer explicit schema structure; decoded records may lack subject data."""
    features = obj.get('phenotypicFeatures', [])
    pxf = isinstance(obj.get('subject'), dict)
    bff = False
    if isinstance(features, list):
        for feature in features:
            if isinstance(feature, dict):
                pxf = pxf or isinstance(feature.get('type'), dict)
                bff = bff or isinstance(feature.get('featureType'), dict)
    if pxf and bff:
        raise ValueError('Record mixes BFF and PXF phenotype structures')
    return 'pxf' if pxf else 'bff' if bff else fallback


def phenotype_overview(obj, data_type, styles):
    features = obj.get('phenotypicFeatures')
    if not isinstance(features, list) or not features:
        return [paragraph("Phenotype annotations", styles['SectionTitle']),
                paragraph("No phenotype annotations supplied. This does not establish the absence of phenotypic findings.", styles['ReportSubtitle'])]
    rows = [[paragraph('Phenotype annotations', styles['SectionTitle']), '', ''],
            [paragraph(label, styles['Badge']) for label in ('Reported term', 'Ontology ID', 'Exclusion status')]]
    for feature in features:
        feature = feature if isinstance(feature, dict) else {}
        term = feature.get('type' if data_type == 'pxf' else 'featureType')
        term = term if isinstance(term, dict) else {}
        excluded = feature.get('excluded')
        if excluded is True or isinstance(excluded, str) and excluded.lower() == 'true':
            status = 'Excluded'
        elif excluded is False or isinstance(excluded, str) and excluded.lower() == 'false':
            status = 'Not excluded'
        else:
            status = 'Not specified' if excluded is None else f'As supplied: {excluded}'
        label = term.get('label')
        rows.append([paragraph(label or 'Label not supplied', styles['TableValue']),
                     paragraph(term.get('id') or 'ID not supplied', styles['TableValue']),
                     paragraph(status, styles['TableValue'])])
    table = Table(rows, colWidths=[CONTENT_WIDTH * .50, CONTENT_WIDTH * .25, CONTENT_WIDTH * .25],
                  repeatRows=2, splitInRow=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('SPAN', (0, 0), (-1, 0)), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 1), (-1, 1), BRAND_SOFT),
        ('LINEBELOW', (0, 1), (-1, 1), .8, BRAND),
        ('LINEBELOW', (0, 2), (-1, -1), .25, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    result = [table, Spacer(1, 6), paragraph(
        'Exclusion status is reproduced from the supplied data. Unspecified status is not interpreted as present or absent.',
        styles['ReportSubtitle'])]
    return result


def draw_page(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.line(document.leftMargin, .48 * inch, letter[0] - document.rightMargin, .48 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    identity = getattr(document, 'record_identity', '')
    while canvas.stringWidth(identity, 'Helvetica', 8) > CONTENT_WIDTH - 60:
        identity = identity[:-4] + '...'
    canvas.drawString(document.leftMargin, .63 * inch, f"Record: {identity}")
    canvas.drawString(document.leftMargin, .3 * inch, "Pheno-Ranker | Structured record, not a diagnostic interpretation")
    canvas.drawRightString(letter[0] - document.rightMargin, .3 * inch, f"Page {document.page}")
    canvas.restoreState()

def pdf_display_record(obj, qr_code_file, template, labels):
    from qr_code_utils import decode_qr_code, reconstruct_json_from_binary
    _, bits, _ = decode_qr_code(qr_code_file)
    plain = reconstruct_json_from_binary(bits, template)
    # Validate the source pair before attaching any display-only labels.
    stem = os.path.splitext(os.path.basename(qr_code_file))[0]
    if obj.get('id_from_qr') != stem or plain != {key: value for key, value in obj.items() if key != 'id_from_qr'}:
        raise ValueError('PDF source record does not match the QR image and global template')
    display = reconstruct_json_from_binary(bits, template, labels)
    display['id_from_qr'] = stem
    return display


def json_to_pdf(json_data, qr_code_files, output_dir, data_type, logo_path=None, test=False, labels=None, template=None):
    if len(json_data) != len(qr_code_files):
        raise ValueError("The number of JSON objects does not match the number of PNG files.")
    if (labels is None) != (template is None):
        raise ValueError('PDF display labels require both --labels and the matching --template')
    if labels is not None:
        from qr_code_utils import validate_vector_labels
        validate_vector_labels(labels, template)

    styles = get_report_styles()

    for obj, qr_code_file in zip(json_data, qr_code_files):
        display = pdf_display_record(obj, qr_code_file, template, labels) if labels is not None else obj
        report_type = record_format(obj, data_type)
        id_value = obj.get('id_from_qr', 'default').replace(':', '_')
        pdf_file_name = f'{id_value}.pdf'
        pdf_path = os.path.join(output_dir, pdf_file_name)

        pdf = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            leftMargin=0.7 * inch,
            rightMargin=0.7 * inch,
            topMargin=0.55 * inch,
            bottomMargin=0.85 * inch,
            title=f"Pheno-Ranker record {obj.get('id', id_value)}",
            author="Pheno-Ranker",
        )
        pdf.record_identity = str(obj.get('id', obj.get('id_from_qr', 'Unknown')))

        elements = []

        elements.append(build_header(qr_code_file, logo_path, obj, report_type, styles))
        elements.append(Spacer(1, 10))
        elements.append(build_metadata_table(obj, report_type, styles, test))
        elements.append(Spacer(1, 12))
        elements.append(paragraph("Scope: this report describes the supplied structured profile. QR-decoded profiles contain encoded features only and may omit information from the original record. Missing fields are not negative findings.", styles["ReportSubtitle"]))
        elements.append(Spacer(1, 10))
        elements.extend(phenotype_overview(display, report_type, styles))
        elements.append(Spacer(1, 12))
        elements.append(paragraph("Record details" if labels is not None else "Source record details", styles["SectionTitle"]))
        elements.append(paragraph("Exact schema names, identifiers and supplied values are retained below for verification.", styles["ReportSubtitle"]))
        if labels is not None:
            elements.append(paragraph('Missing ontology labels are supplemented for display from the matching analysis label file. These hints also appear in the phenotype overview; the decoded JSON and QR payload remain unchanged.', styles['ReportSubtitle']))
        elements.append(Spacer(1, 6))

        section_order = ['subject', 'sex', 'phenotypicFeatures', 'diseases', 'measurements', 'measures',
                         'medicalActions', 'treatments', 'interventionsOrProcedures', 'exposures', 'interpretations']
        for term in sorted(obj, key=lambda key: (section_order.index(key) if key in section_order else len(section_order), key)):
            if term in {"id", "id_from_qr"}:
                continue

            tables = create_tables_for_term(obj, term, display if labels is not None else None)
            if tables:
                for table in tables:
                    table.hAlign = 'LEFT'
                    elements.append(table)
                    elements.append(Spacer(1, 12))

        pdf.build(elements, onFirstPage=draw_page, onLaterPages=draw_page)

def main_generate():
    parser = argparse.ArgumentParser(description='Convert JSON data to a formatted PDF file.')
    parser.add_argument('-j', '--json', required=True, type=readable_file, help='Path to the JSON file.')
    parser.add_argument('-q', '--qr', required=True, nargs='+', help='Path to the QR code images, use space to separate multiple files.')
    parser.add_argument('-o', '--output', default='pdf', help='Output directory for PDF files. Default: pdf')
    parser.add_argument('-t', '--type', required=True, choices=['bff', 'pxf'], help='Type of data processing required.')
    parser.add_argument('-l', '--logo', type=readable_file, help='Custom logo image (default: Pheno-Ranker logo).')
    parser.add_argument('--labels', type=readable_file, help='Optional export.labels.json[.gz] to supplement missing ontology display labels.')
    parser.add_argument('--template', type=readable_file, help='Matching export.glob_hash.json; required with --labels to resolve binary-vector positions.')
    parser.add_argument('--test', action='store_true', help='Enable test mode (does not print date to PDF).')

    args = parser.parse_args()
    if bool(args.labels) != bool(args.template):
        parser.error('--labels and --template must be supplied together')

    with open(args.json, 'r', encoding='utf-8') as file:
        json_data = json.load(file)
    qr_files = expand_files(args.qr, '.png', 'QR')

    if not os.path.exists(args.output):
        os.makedirs(args.output)

    from qr_code_utils import load_json_file, load_vector_labels
    template = load_json_file(args.template) if args.template else None
    labels = load_vector_labels(args.labels, template) if args.labels else None
    json_to_pdf(json_data, qr_files, args.output, args.type, args.logo, args.test, labels=labels, template=template)
