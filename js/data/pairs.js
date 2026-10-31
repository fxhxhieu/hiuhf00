/* hiuhf0 — cặp âm dễ nhầm. Mỗi nhóm có: id (mã ổn định để lưu tiến độ), cat (nhóm lớn), imp (độ quan trọng đối với việc người khác
 * nghe hiểu, 1 là bình thường), sound (tên nhóm), tip (mẹo bằng tiếng Việt) và pairs. Mỗi cặp: [từ A, IPA A, từ B, IPA B].
 * cat: vowel (nguyên âm), cons (phụ âm đầu), final (âm cuối), cluster (cụm phụ âm). */
window.PAIRS = [
 { "id": "iy-ih", "cat": "vowel", "imp": 1, "sound": "/i/ và /ɪ/", "tip": "Âm i dài và i ngắn: người Việt hay đọc cả hai thành “i”.", "pairs": [ [ "sheep", "ˈʃip", "ship", "ˈʃɪp" ], [ "seat", "ˈsit", "sit", "ˈsɪt" ], [ "beat", "ˈbit", "bit", "ˈbɪt" ], [ "feel", "ˈfil", "fill", "ˈfɪl" ], [ "heat", "ˈhit", "hit", "ˈhɪt" ], [ "green", "ˈgrin", "grin", "ˈgrɪn" ], [ "peak", "ˈpik", "pick", "ˈpɪk" ], [ "steal", "ˈstil", "still", "ˈstɪl" ] ]
 },
 { "id": "ae-ah", "cat": "vowel", "imp": 0.9, "sound": "/æ/ và /ʌ/", "tip": "Âm “e” mở và âm “ơ” ngắn.", "pairs": [ [ "bat", "ˈbæt", "but", "ˈbʌt" ], [ "cat", "ˈkæt", "cut", "ˈkʌt" ], [ "ran", "ˈræn", "run", "ˈrʌn" ], [ "hat", "ˈhæt", "hut", "ˈhʌt" ], [ "cap", "ˈkæp", "cup", "ˈkʌp" ], [ "lack", "ˈlæk", "luck", "ˈlʌk" ] ]
 },
 { "id": "ae-eh", "cat": "vowel", "imp": 1, "sound": "/æ/ và /ɛ/", "tip": "Mở miệng rộng hơn khi đọc /æ/.", "pairs": [ [ "bad", "ˈbæd", "bed", "ˈbɛd" ], [ "man", "ˈmæn", "men", "ˈmɛn" ], [ "pan", "ˈpæn", "pen", "ˈpɛn" ], [ "sat", "ˈsæt", "set", "ˈsɛt" ], [ "bat", "ˈbæt", "bet", "ˈbɛt" ] ]
 },
 { "id": "uh-uw", "cat": "vowel", "imp": 0.9, "sound": "/ʊ/ và /u/", "tip": "U ngắn và u dài.", "pairs": [ [ "full", "ˈfʊl", "fool", "ˈful" ], [ "pull", "ˈpʊl", "pool", "ˈpul" ], [ "wood", "ˈwʊd", "wooed", "ˈwud" ] ]
 },
 { "id": "ey-eh", "cat": "vowel", "imp": 0.8, "sound": "/eɪ/ và /ɛ/", "tip": "Đọc /eɪ/ kéo dài và trượt lên.", "pairs": [ [ "late", "ˈleɪt", "let", "ˈlɛt" ], [ "pain", "ˈpeɪn", "pen", "ˈpɛn" ], [ "wait", "ˈweɪt", "wet", "ˈwɛt" ], [ "tale", "ˈteɪl", "tell", "ˈtɛl" ], [ "main", "ˈmeɪn", "men", "ˈmɛn" ] ]
 },
 { "id": "th-s", "cat": "cons", "imp": 1, "sound": "/θ/ và /s/, /t/", "tip": "Đặt đầu lưỡi giữa hai hàm răng khi đọc /θ/.", "pairs": [ [ "think", "ˈθɪŋk", "sink", "ˈsɪŋk" ], [ "thank", "ˈθæŋk", "sank", "ˈsæŋk" ], [ "three", "ˈθri", "tree", "ˈtri" ], [ "thin", "ˈθɪn", "tin", "ˈtɪn" ], [ "mouth", "ˈmaʊθ", "mouse", "ˈmaʊs" ], [ "path", "ˈpæθ", "pass", "ˈpæs" ] ]
 },
 { "id": "dh-d", "cat": "cons", "imp": 0.9, "sound": "/ð/ và /d/, /z/", "tip": "Âm /ð/ có rung, lưỡi chạm răng.", "pairs": [ [ "they", "ˈðeɪ", "day", "ˈdeɪ" ], [ "then", "ˈðɛn", "den", "ˈdɛn" ], [ "though", "ˈðoʊ", "dough", "ˈdoʊ" ], [ "breathe", "ˈbrið", "breeze", "ˈbriz" ] ]
 },
 { "id": "l-r", "cat": "cons", "imp": 1, "sound": "/l/ và /r/", "tip": "Lưỡi chạm lợi trên với /l/, cuộn lưỡi không chạm với /r/.", "pairs": [ [ "light", "ˈlaɪt", "right", "ˈraɪt" ], [ "lock", "ˈlɑk", "rock", "ˈrɑk" ], [ "long", "ˈlɔŋ", "wrong", "ˈrɔŋ" ], [ "play", "ˈpleɪ", "pray", "ˈpreɪ" ], [ "glass", "ˈglæs", "grass", "ˈgræs" ], [ "led", "ˈlɛd", "red", "ˈrɛd" ], [ "fly", "ˈflaɪ", "fry", "ˈfraɪ" ] ]
 },
 { "id": "b-v", "cat": "cons", "imp": 0.7, "sound": "/b/ và /v/", "tip": "/v/ cắn nhẹ môi dưới, /b/ mím hai môi.", "pairs": [ [ "berry", "ˈbɛri", "very", "ˈvɛri" ], [ "boat", "ˈboʊt", "vote", "ˈvoʊt" ], [ "best", "ˈbɛst", "vest", "ˈvɛst" ], [ "ban", "ˈbæn", "van", "ˈvæn" ], [ "bow", "ˈbaʊ", "vow", "ˈvaʊ" ] ]
 },
 { "id": "sh-ch", "cat": "cons", "imp": 0.9, "sound": "/ʃ/ và /tʃ/", "tip": "/ʃ/ kéo dài, /tʃ/ bật hơi.", "pairs": [ [ "ship", "ˈʃɪp", "chip", "ˈtʃɪp" ], [ "shoes", "ˈʃuz", "choose", "ˈtʃuz" ], [ "sheep", "ˈʃip", "cheap", "ˈtʃip" ], [ "wash", "ˈwɑʃ", "watch", "ˈwɑtʃ" ], [ "share", "ˈʃɛr", "chair", "ˈtʃɛr" ], [ "shin", "ˈʃɪn", "chin", "ˈtʃɪn" ] ]
 },
 { "id": "sh-s", "cat": "cons", "imp": 1, "sound": "/ʃ/ và /s/", "tip": "Môi hơi tròn và lưỡi lùi lại khi đọc /ʃ/.", "pairs": [ [ "she", "ˈʃi", "see", "ˈsi" ], [ "shy", "ˈʃaɪ", "sigh", "ˈsaɪ" ], [ "shine", "ˈʃaɪn", "sign", "ˈsaɪn" ], [ "sheet", "ˈʃit", "seat", "ˈsit" ], [ "shore", "ˈʃɔr", "sore", "ˈsɔr" ] ]
 },
 { "id": "n-ng", "cat": "final", "imp": 1, "sound": "/n/ và /ŋ/", "tip": "/ŋ/ cuối từ: không chạm đầu lưỡi lên lợi.", "pairs": [ [ "sin", "ˈsɪn", "sing", "ˈsɪŋ" ], [ "thin", "ˈθɪn", "thing", "ˈθɪŋ" ], [ "ban", "ˈbæn", "bang", "ˈbæŋ" ], [ "ran", "ˈræn", "rang", "ˈræŋ" ], [ "win", "ˈwɪn", "wing", "ˈwɪŋ" ] ]
 },
 { "id": "fin-voice", "cat": "final", "imp": 1.5, "sound": "Âm cuối vô thanh / hữu thanh", "tip": "Đừng bỏ âm cuối: cap khác cab, rice khác rise.", "pairs": [ [ "cap", "ˈkæp", "cab", "ˈkæb" ], [ "back", "ˈbæk", "bag", "ˈbæg" ], [ "rope", "ˈroʊp", "robe", "ˈroʊb" ], [ "rice", "ˈraɪs", "rise", "ˈraɪz" ], [ "peace", "ˈpis", "peas", "ˈpiz" ], [ "safe", "ˈseɪf", "save", "ˈseɪv" ], [ "price", "ˈpraɪs", "prize", "ˈpraɪz" ], [ "bus", "ˈbəs", "buzz", "ˈbəz" ] ]
 },
 { "id": "fin-stop", "cat": "final", "imp": 1.5, "sound": "Có hay không âm cuối /t/, /k/, /p/", "tip": "Tiếng Việt cũng có âm cuối p, t, k nhưng khi nói tiếng Anh người học hay bỏ hoặc nuốt mất. Hãy đóng âm cuối rõ ràng: bee khác beat.", "pairs": [ [ "bee", "ˈbi", "beat", "ˈbit" ], [ "bye", "ˈbaɪ", "bite", "ˈbaɪt" ], [ "say", "ˈseɪ", "sake", "ˈseɪk" ], [ "row", "ˈroʊ", "rope", "ˈroʊp" ], [ "pea", "ˈpi", "peak", "ˈpik" ], [ "car", "ˈkɑr", "cart", "ˈkɑrt" ], [ "go", "ˈgoʊ", "goat", "ˈgoʊt" ] ]
 },
 { "id": "fin-s", "cat": "final", "imp": 1.4, "sound": "Có hay không âm cuối /s/, /z/", "tip": "Tiếng Việt không có âm cuối /s/ và /z/. Số nhiều và động từ ngôi thứ ba rất cần âm này: car khác cars.", "pairs": [ [ "bee", "ˈbi", "bees", "ˈbiz" ], [ "pea", "ˈpi", "peas", "ˈpiz" ], [ "car", "ˈkɑr", "cars", "ˈkɑrz" ], [ "cat", "ˈkæt", "cats", "ˈkæts" ], [ "book", "ˈbʊk", "books", "ˈbʊks" ], [ "work", "ˈwɝk", "works", "ˈwɝks" ], [ "tree", "ˈtri", "trees", "ˈtriz" ] ]
 },
 { "id": "fin-l", "cat": "final", "imp": 1, "sound": "Có hay không âm /l/ cuối từ", "tip": "Âm /l/ cuối từ: đầu lưỡi chạm lợi trên và giữ lại một chút, đừng bỏ hay đổi thành “âu”: feel không phải “phiu”.", "pairs": [ [ "fee", "ˈfi", "feel", "ˈfil" ], [ "pay", "ˈpeɪ", "pale", "ˈpeɪl" ], [ "say", "ˈseɪ", "sale", "ˈseɪl" ], [ "go", "ˈgoʊ", "goal", "ˈgoʊl" ], [ "so", "ˈsoʊ", "soul", "ˈsoʊl" ], [ "bye", "ˈbaɪ", "bile", "ˈbaɪl" ] ]
 },
 { "id": "fin-cluster", "cat": "cluster", "imp": 1.5, "sound": "Cụm phụ âm cuối", "tip": "Đừng rụng âm cuối khi có hai phụ âm đi liền: best không phải “bét”, past không phải “pát”.", "pairs": [ [ "pass", "ˈpæs", "past", "ˈpæst" ], [ "bus", "ˈbʌs", "bust", "ˈbʌst" ], [ "wine", "ˈwaɪn", "wind", "ˈwaɪnd" ], [ "ten", "ˈtɛn", "tent", "ˈtɛnt" ], [ "let", "ˈlɛt", "left", "ˈlɛft" ], [ "bet", "ˈbɛt", "best", "ˈbɛst" ], [ "mass", "ˈmæs", "mask", "ˈmæsk" ], [ "ran", "ˈræn", "rant", "ˈrænt" ] ]
 },
 { "id": "init-s", "cat": "cluster", "imp": 1.2, "sound": "Cụm /s/ đầu từ (sp, st, sk, str)", "tip": "Đọc liền /s/ với phụ âm sau, đừng chèn “ơ” ở giữa hay bỏ /s/: spot không phải “sơ-pót” hay “pót”.", "pairs": [ [ "sit", "ˈsɪt", "spit", "ˈspɪt" ], [ "say", "ˈseɪ", "stay", "ˈsteɪ" ], [ "sing", "ˈsɪŋ", "sting", "ˈstɪŋ" ], [ "sick", "ˈsɪk", "stick", "ˈstɪk" ], [ "kill", "ˈkɪl", "skill", "ˈskɪl" ], [ "seat", "ˈsit", "street", "ˈstrit" ], [ "pot", "ˈpɑt", "spot", "ˈspɑt" ] ]
 },
 { "id": "init-lr", "cat": "cluster", "imp": 1.1, "sound": "Cụm có /l/, /r/ đầu từ (pl, pr, bl, fr…)", "tip": "Đừng bỏ /l/ hoặc /r/ trong cụm đầu từ: play khác pay, free khác fee.", "pairs": [ [ "pay", "ˈpeɪ", "play", "ˈpleɪ" ], [ "pay", "ˈpeɪ", "pray", "ˈpreɪ" ], [ "back", "ˈbæk", "black", "ˈblæk" ], [ "fee", "ˈfi", "free", "ˈfri" ], [ "go", "ˈgoʊ", "grow", "ˈgroʊ" ], [ "tie", "ˈtaɪ", "try", "ˈtraɪ" ], [ "cap", "ˈkæp", "clap", "ˈklæp" ] ]
 },
 { "id": "aa-ah", "cat": "vowel", "imp": 0.9, "sound": "/ɑ/ và /ʌ/", "tip": "/ɑ/ mở miệng rộng, lưỡi thấp; /ʌ/ ngắn, miệng mở vừa.", "pairs": [ [ "hot", "ˈhɑt", "hut", "ˈhʌt" ], [ "cop", "ˈkɑp", "cup", "ˈkʌp" ], [ "lock", "ˈlɑk", "luck", "ˈlʌk" ], [ "dock", "ˈdɑk", "duck", "ˈdʌk" ], [ "shot", "ˈʃɑt", "shut", "ˈʃʌt" ], [ "stock", "ˈstɑk", "stuck", "ˈstʌk" ] ]
 },
 { "id": "eh-ih", "cat": "vowel", "imp": 0.9, "sound": "/ɛ/ và /ɪ/", "tip": "/ɛ/ miệng mở vừa như “e”; /ɪ/ ngắn, miệng khép hơn, nằm giữa “i” và “ê”.", "pairs": [ [ "pen", "ˈpɛn", "pin", "ˈpɪn" ], [ "ten", "ˈtɛn", "tin", "ˈtɪn" ], [ "bed", "ˈbɛd", "bid", "ˈbɪd" ], [ "set", "ˈsɛt", "sit", "ˈsɪt" ], [ "red", "ˈrɛd", "rid", "ˈrɪd" ], [ "fell", "ˈfɛl", "fill", "ˈfɪl" ] ]
 },
 { "id": "jh-y", "cat": "cons", "imp": 0.7, "sound": "/dʒ/ và /j/", "tip": "/dʒ/ bật ra rồi xát, có rung cổ họng; /j/ là âm lướt nhẹ như “i” đầu từ yes.", "pairs": [ [ "jam", "ˈdʒæm", "yam", "ˈjæm" ], [ "jet", "ˈdʒɛt", "yet", "ˈjɛt" ], [ "jell", "ˈdʒɛl", "yell", "ˈjɛl" ], [ "Jess", "ˈdʒɛs", "yes", "ˈjɛs" ], [ "joke", "ˈdʒoʊk", "yolk", "ˈjoʊk" ] ]
 }
];
