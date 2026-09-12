# -*- coding: utf-8 -*-
"""Генерира теоретична писмена защита (.docx) по методическите указания."""
from pathlib import Path
import sys

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

sys.path.insert(0, str(Path(__file__).resolve().parent))
from defense_extra import EXTRA
from defense_extra_more import EXTRA_MORE
from defense_extra3 import EXTRA3

OUT = Path(__file__).resolve().parent / "11_Stanimir_Zhelyazkov_PismenaZashtita.docx"


def set_run_font(run, size=12, bold=False, italic=False, name="Times New Roman", mono=False):
    run.bold = bold
    run.italic = italic
    run.font.name = "Consolas" if mono else name
    run.font.size = Pt(size)
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:ascii"), run.font.name)
    rFonts.set(qn("w:hAnsi"), run.font.name)
    rFonts.set(qn("w:cs"), run.font.name)
    rFonts.set(qn("w:eastAsia"), run.font.name)


def style_para(p, align="justify", first_indent=True, space_after=6):
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    pf.space_after = Pt(space_after)
    pf.space_before = Pt(0)
    if align == "justify":
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    elif align == "center":
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == "left":
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    elif align == "right":
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    if first_indent and align == "justify":
        pf.first_line_indent = Cm(1.25)
    else:
        pf.first_line_indent = Cm(0)


def add_page_number(paragraph):
    run = paragraph.add_run()
    fldChar1 = OxmlElement("w:fldChar")
    fldChar1.set(qn("w:fldCharType"), "begin")
    instrText = OxmlElement("w:instrText")
    instrText.set(qn("xml:space"), "preserve")
    instrText.text = " PAGE "
    fldChar2 = OxmlElement("w:fldChar")
    fldChar2.set(qn("w:fldCharType"), "end")
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    set_run_font(run, 12)


def setup_doc(doc):
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(2.0)

    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_page_number(p)

    # титул + съдържание без видим номер: започваме от 0 и скриваме на първите —
    # по указанията титулът е стр.1 без номер; за простота номерът е в footer навсякъде
    # след титула. Word field PAGE брои от 1.


def add_center(doc, text, size=12, bold=False, space_after=6):
    p = doc.add_paragraph()
    style_para(p, align="center", first_indent=False, space_after=space_after)
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold)
    return p


def add_p(doc, text, cite=None):
    p = doc.add_paragraph()
    style_para(p, align="justify", first_indent=True)
    run = p.add_run(text)
    set_run_font(run, 12)
    if cite:
        r2 = p.add_run(f" [{cite}]")
        set_run_font(r2, 12)
    return p


def add_h1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.page_break_before = True
    style_para(p, align="left", first_indent=False, space_after=12)
    run = p.add_run(text)
    set_run_font(run, 16, bold=True)
    return p


def add_h2(doc, text):
    p = doc.add_paragraph()
    style_para(p, align="left", first_indent=False, space_after=10)
    run = p.add_run(text)
    set_run_font(run, 14, bold=True)
    return p


def add_h3(doc, text):
    p = doc.add_paragraph()
    style_para(p, align="left", first_indent=False, space_after=8)
    run = p.add_run(text)
    set_run_font(run, 13, bold=True, italic=True)
    return p


def add_caption(doc, text, kind="figure"):
    p = doc.add_paragraph()
    style_para(p, align="center", first_indent=False, space_after=10)
    run = p.add_run(text)
    set_run_font(run, 11, italic=True)
    return p


def add_table_title(doc, text):
    p = doc.add_paragraph()
    style_para(p, align="left", first_indent=False, space_after=4)
    run = p.add_run(text)
    set_run_font(run, 12, bold=True)
    return p


def add_code(doc, lines):
    p = doc.add_paragraph()
    style_para(p, align="left", first_indent=False, space_after=8)
    # сива рамка чрез shading на параграфа
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F0F0F0")
    shd.set(qn("w:val"), "clear")
    pPr = p._p.get_or_add_pPr()
    pPr.append(shd)
    p.paragraph_format.left_indent = Cm(0.5)
    run = p.add_run(lines if isinstance(lines, str) else "\n".join(lines))
    set_run_font(run, 10, mono=True)
    return p


def add_bullets(doc, items):
    for item in items:
        p = doc.add_paragraph()
        style_para(p, align="justify", first_indent=False, space_after=4)
        p.paragraph_format.left_indent = Cm(1.0)
        run = p.add_run("• " + item)
        set_run_font(run, 12)


def add_simple_table(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        run = p.add_run(h)
        set_run_font(run, 11, bold=True)
    for r_i, row in enumerate(rows):
        for c_i, val in enumerate(row):
            cell = table.rows[r_i + 1].cells[c_i]
            cell.text = ""
            p = cell.paragraphs[0]
            run = p.add_run(str(val))
            set_run_font(run, 11)
    doc.add_paragraph()


def build():
    doc = Document()
    setup_doc(doc)

    # ---------- ТИТУЛ ----------
    for _ in range(3):
        add_center(doc, "", space_after=0)
    add_center(
        doc,
        "Професионална гимназия по компютърни науки и математически анализи",
        size=14,
        bold=True,
        space_after=4,
    )
    add_center(doc, "„Проф. Минко Балкански“ – Стара Загора", size=13, bold=False, space_after=24)
    add_center(
        doc,
        "Теоретична писмена защита към практически проект по разработка на софтуер",
        size=14,
        bold=True,
        space_after=24,
    )
    add_center(doc, "Тема на проекта:", size=12, space_after=6)
    add_center(
        doc,
        "Музикална стрийминг платформа (lite версия) — Pulse",
        size=14,
        bold=True,
        space_after=28,
    )
    add_center(doc, "Ученик: Станимир Нанев Желязков", size=12, space_after=4)
    add_center(doc, "Клас: 11", size=12, space_after=4)
    add_center(doc, "Ръководител: ........................................", size=12, space_after=28)
    add_center(doc, "Стара Загора", size=12, space_after=4)
    add_center(doc, "2026", size=12, space_after=4)

    # ---------- СЪДЪРЖАНИЕ ----------
    add_h1(doc, "Съдържание")
    toc = [
        "1. Увод",
        "2. Теоретична част",
        "    2.1. Същност на музикалните стрийминг системи",
        "    2.2. Преглед на сходни продукти",
        "    2.3. Технологичен стек на проекта",
        "    2.4. Обосновка на избора на технологии",
        "    2.5. REST, SPA и поток на данните",
        "    2.6. Сигурност при качване на файлове",
        "    2.7. Аудио формати, метаданни и HTTP Range",
        "    2.8. UX принципи в Pulse",
        "    2.9. Слоеста архитектура",
        "    2.10. Документни бази в учебния контекст",
        "    2.11. Състояние на плеъра",
        "    2.12. Сравнение на архитектурни стилове",
        "    2.13. Синхронизация и кеширане",
        "    2.14. Метаданни и каталожна хигиена",
        "3. Анализ и проектиране",
        "    3.1. Функционални и нефункционални изисквания",
        "    3.2. Роли и права на потребителите",
        "    3.3. Архитектура на системата",
        "    3.4. Модел на данните",
        "    3.5. Основни сценарии на употреба",
        "    3.6. Нефункционален анализ и рискове",
        "    3.7. Проектиране на API контрактите",
        "    3.8. Изисквания към интерфейса",
        "    3.9. Проектиране на процеса на качване",
        "    3.10. Модел на заплахи (опростен)",
        "4. Реализация",
        "    4.1. Среда за разработка",
        "    4.2. Модул автентикация и потребители",
        "    4.3. Модул песни, качване и стрийминг",
        "    4.4. Модул плейлисти и харесани песни",
        "    4.5. Плеър и клиентски интерфейс",
        "    4.6. Админ панел и модерация",
        "    4.7. Нефункционални изисквания в реализацията",
        "    4.8. Клиентска навигация и история",
        "    4.9. Студио на артиста",
        "    4.10. SongList и player mode",
        "    4.11. Административни операции",
        "    4.12. Организация на кода",
        "    4.13. Препоръчителен алгоритъм",
        "    4.14. Харесвания и системни плейлисти",
        "    4.15. Наблюдаемост и тестови данни",
        "    4.16. Съответствие екрани–маршрути",
        "    4.17. Обработка на грешки",
        "    4.18. Жизнен цикъл на песен",
        "    4.19. Клиентски компоненти",
        "    4.20. Производителност на стрийминга",
        "5. Тестване, резултати и демонстрация",
        "    5.1. Подход за тестване",
        "    5.2. Тестови случаи",
        "    5.3. Ограничения и бъдещо развитие",
        "    5.4. Стратегия за демонстрация",
        "    5.5. Съпоставка с критериите за успех",
        "6. Заключение",
        "Използвана литература",
        "Приложения",
    ]
    for line in toc:
        p = doc.add_paragraph()
        style_para(p, align="left", first_indent=False, space_after=2)
        run = p.add_run(line)
        set_run_font(run, 12)

    # ---------- 1. УВОД ----------
    add_h1(doc, "1. Увод")
    add_p(
        doc,
        "Музикалните стрийминг услуги са сред най-използваните цифрови продукти в съвременния интернет. "
        "Вместо да купуват отделни аудиофайлове, потребителите очакват да слушат музика онлайн, да търсят "
        "по заглавие и жанр, да съставят плейлисти и да получават препоръки. Паралелно с това артистите "
        "се нуждаят от лесен начин да качват собствени записи, а администраторите — от инструменти за "
        "модерация и статистика. Тези нужди правят темата за lite музикална стрийминг платформа актуална "
        "както от потребителска, така и от учебно-практическа гледна точка.",
    )
    add_p(
        doc,
        "Актуалността се подсилва и от технологичния контекст. Пълнофункционалните търговски системи "
        "(Spotify, Apple Music, YouTube Music) са мащабни облачни продукти, но учебният проект изисква "
        "да се разбере същата предметна област в намален, но работещ вид: клиент–сървър архитектура, "
        "REST API, база данни, автентикация, качване на файлове и аудио плеър в браузъра. Реализацията "
        "на такава система демонстрира пълния цикъл на full-stack разработката върху разрешен технологичен "
        "стек React (Vite) + Node.js/Express + MongoDB.",
    )
    add_p(
        doc,
        "Цел на проекта: да се проектира и реализира работеща lite музикална стрийминг уеб платформа "
        "(под работното име Pulse), която позволява регистрация и вход на потребители с различни роли, "
        "качване и слушане на песни, търсене, препоръки, плейлисти и административна модерация.",
    )
    add_p(doc, "За постигане на целта са формулирани следните задачи:")
    add_bullets(
        doc,
        [
            "да се изгради REST бекенд с Express и модели в MongoDB за потребители, песни и плейлисти;",
            "да се реализира JWT автентикация с роли listener, artist и admin, включително валидация на имейл;",
            "да се осигури качване на MP3 и обложки (Multer), стрийминг с HTTP Range и броене на слушания;",
            "да се създаде React клиент с глобален плеър, каталог, студио за артисти, плейлисти и админ панел;",
            "да се реализират опростени препоръки по история на слушане и системни плейлисти „Liked Songs“;",
            "да се тестват основните потребителски сценарии и да се документират резултатите в настоящата защита.",
        ],
    )
    add_p(
        doc,
        "Обект на разработката е уеб базирана музикална стрийминг система за локално/учебно ползване. "
        "Предмет на разработката са архитектурните и програмните решения за автентикация, съхранение и "
        "доставка на аудио съдържание, управление на плейлисти, клиентски плеър и ролеви достъп.",
    )
    add_p(
        doc,
        "Структурата на писмената защита следва методическите указания. В глава 2 е представена "
        "теоретичната рамка на стрийминг системите и избраният стек. Глава 3 съдържа анализа на "
        "изискванията, ролите, архитектурата и модела на данните. Глава 4 описва реализацията на "
        "модулите според реалния код на проекта. Глава 5 обобщава тестването и ограниченията. "
        "Заключението съпоставя постигнатото с поставените задачи.",
    )
    add_p(
        doc,
        "Текстът нарочно избягва преразказ ред по ред на изходния код. Вместо това се "
        "аргументират решения: защо JWT, защо Range, защо Context вместо Redux, защо "
        "трите колекции User/Song/Playlist са достатъчни за lite модела. Кратките "
        "кодови фрагменти са илюстративни и са ограничени по обем според указанията.",
    )

    # ---------- 2. ТЕОРЕТИЧНА ----------
    add_h1(doc, "2. Теоретична част")

    add_h2(doc, "2.1. Същност на музикалните стрийминг системи")
    add_p(
        doc,
        "Музикалният стрийминг е модел за разпространение на аудио, при който съдържанието не се "
        "изтегля предварително като завършен файл за офлайн ползване (макар че някои продукти "
        "добавят и такава опция), а се предава постепенно през мрежата, докато потребителят слуша. "
        "От гледна точка на системния дизайн това означава наличие на каталог от записи, метаданни "
        "(заглавие, изпълнител, жанр, продължителност, обложка), механизъм за автентикация на "
        "потребители и компонент за възпроизвеждане.",
    )
    add_p(
        doc,
        "Типичната стрийминг платформа разграничава поне три гледни точки. Слушателят разглежда "
        "каталога, търси, пуска песни и управлява плейлисти. Артистът (или издателят) качва "
        "аудиофайлове и свързани изображения. Администраторът следи статистика, скрива или "
        "премахва неподходящо съдържание и управлява потребителски роли. Lite версията на такива "
        "системи запазва тези роли, но опростява бизнес логиката: няма плащания, DRM, социални "
        "мрежи с коментари в реално време или разпределено CDN — фокусът е върху учебната "
        "демонстрация на основните потоци данни.",
    )
    add_p(
        doc,
        "Ключов технически елемент е доставката на аудио. Браузърът използва HTML елемент <audio> "
        "или Web Audio API. Сървърът трябва да сервира файла ефективно; поддръжката на HTTP Range "
        "заявки позволява превъртане (seek) без презареждане на целия файл отначало. Метаданните "
        "се пазят в база данни, а двоичните файлове — във файлова система или обектно хранилище. "
        "В учебния проект файловете се записват локално в папка uploads и се обслужват статично "
        "или чрез специализиран stream endpoint.",
    )
    add_p(
        doc,
        "Препоръчителните системи в търговските продукти използват сложни модели за машинно "
        "обучение. В lite вариант е достатъчна евристика: ако потребителят е слушал определени "
        "жанрове и изпълнители, системата предлага песни със сходни атрибути, които още не са "
        "в историята му; при липса на история се показват най-слушаните записи. Това е прозрачно "
        "за обяснение и достатъчно за демонстрация на персонализация.",
    )
    add_p(
        doc,
        "От гледна точка на сигурността стрийминг платформата трябва да разграничава публични "
        "операции (разглеждане на каталог) от защитени (качване, админ действия, лични плейлисти). "
        "Съвременният стандартен подход за SPA (Single Page Application) клиенти е token-based "
        "автентикация — най-често JWT, предаван в Authorization хедъра. Паролите не се пазят "
        "в явен вид, а като криптографски хеш (напр. bcrypt).",
    )

    add_h2(doc, "2.2. Преглед на сходни продукти")
    add_p(
        doc,
        "За да се позиционира учебният проект, е полезно сравнение с три широко познати решения. "
        "Сравнението не претендира за пълна пазарна анализа, а подчертава кои функции са запазени "
        "в lite версията и кои съзнателно са извън обхвата.",
    )
    add_h3(doc, "2.2.1. Spotify")
    add_p(
        doc,
        "Spotify е водеща стрийминг услуга с огромен каталог, персонализирани плейлисти "
        "(Discover Weekly), социални функции и клиентски приложения за множество платформи. "
        "Интерфейсът използва тъмна тема и зелен акцент, странична навигация и долен плеър — "
        "визуален модел, към който се доближава и UI на Pulse. Spotify обаче разчита на "
        "облачна инфраструктура, лицензирани каталози и платени абонаменти, което е извън "
        "учебния обхват.",
        cite=1,
    )
    add_h3(doc, "2.2.2. YouTube Music")
    add_p(
        doc,
        "YouTube Music комбинира музикални клипове и аудио записи в екосистемата на Google. "
        "Силните страни са търсенето, препоръките и интеграцията с видео съдържание. За "
        "сравнение, Pulse работи само с качени MP3 файлове и обложки, без видео слой и без "
        "външен каталог от трети страни.",
        cite=2,
    )
    add_h3(doc, "2.2.3. SoundCloud")
    add_p(
        doc,
        "SoundCloud е по-близо до учебния сценарий „артист качва собствена музика“: потребители "
        "качват записи, слушатели ги откриват и коментират. Pulse заимства идеята за студио на "
        "артиста и публичен каталог, но без социални коментари и без външен хостинг. Качването "
        "става към локалния Express сървър чрез Multer.",
        cite=3,
    )
    add_table_title(doc, "Таблица 1. Сравнение на функции (обобщено)")
    add_simple_table(
        doc,
        ["Функция", "Spotify", "YouTube Music", "SoundCloud", "Pulse (проект)"],
        [
            ["Слушане онлайн", "Да", "Да", "Да", "Да"],
            ["Качване от артист", "Ограничено", "Ограничено", "Да", "Да"],
            ["Плейлисти", "Да", "Да", "Да", "Да"],
            ["Препоръки", "ML", "ML", "Частично", "Евристика"],
            ["Админ модерация", "Вътрешно", "Вътрешно", "Вътрешно", "Да (роля admin)"],
            ["Плащания/абонамент", "Да", "Да", "Да", "Не"],
        ],
    )
    add_p(
        doc,
        "От таблица 1 следва, че Pulse покрива ядрото на предметната област за учебно задание: "
        "слушане, качване, плейлисти, търсене, роли и базови препоръки, без комерсиалните "
        "подсистеми.",
    )

    add_h2(doc, "2.3. Технологичен стек на проекта")
    add_p(
        doc,
        "Проектът е реализиран строго в рамките на разрешения стек: React 18 с Vite и обикновен "
        "CSS за клиента; Node.js с Express за REST API; MongoDB чрез Mongoose за персистентност; "
        "JWT за сесии; Multer за качване на файлове; HTML Audio / Web Audio API за възпроизвеждане "
        "и визуализация. Не са използвани Redux, Next.js, Tailwind CSS или TypeScript.",
    )
    add_h3(doc, "2.3.1. React и Vite")
    add_p(
        doc,
        "React е библиотека за изграждане на потребителски интерфейси чрез компоненти и "
        "декларативно описание на UI според състоянието. Vite осигурява бърз dev сървър и "
        "сглобяване на клиентския бандъл. В проекта страниците (Home, Discover, Studio, "
        "Playlists, Admin, Now Playing, Login, Register) са React компоненти, а глобалното "
        "състояние на плеъра се споделя чрез React Context (PlayerContext), без външна "
        "state-management библиотека.",
        cite=4,
    )
    add_h3(doc, "2.3.2. Node.js, Express и REST")
    add_p(
        doc,
        "Express е минималистичен уеб framework върху Node.js. REST API организира ресурсите "
        "около URL пътища и HTTP методи: GET за четене, POST за създаване, PUT/PATCH за промяна, "
        "DELETE за изтриване. В Pulse маршрутите са групирани в /api/auth, /api/songs, "
        "/api/playlists и /api/admin. Това разделяне улеснява поддръжката и съответства на "
        "модулната структура на папките routes и models.",
        cite=5,
    )
    add_h3(doc, "2.3.3. MongoDB и Mongoose")
    add_p(
        doc,
        "MongoDB е документно ориентирана база данни. Записите се пазят като BSON документи в "
        "колекции, което е удобно за гъвкави схеми. Mongoose добавя схеми, валидации и удобен "
        "API за заявки от Node.js. В проекта има три основни модела: User, Song и Playlist, с "
        "референции чрез ObjectId (напр. песен.uploadedBy → потребител; плейлист.songs → песни).",
        cite=6,
    )
    add_h3(doc, "2.3.4. JWT, bcrypt, Multer и music-metadata")
    add_p(
        doc,
        "JSON Web Token кодира самоличността на потребителя след успешен вход. Токенът се "
        "подписва със секретен ключ (JWT_SECRET) и се проверява в middleware protect. "
        "Паролите се хешират с bcryptjs. Multer приема multipart/form-data при качване на "
        "MP3 и изображения. Библиотеката music-metadata извлича продължителността на аудиофайла "
        "при upload, вместо потребителят да я въвежда ръчно.",
        cite=7,
    )
    add_h3(doc, "2.3.5. Клиентски аудио стек")
    add_p(
        doc,
        "Възпроизвеждането се управлява от един дългоживущ Audio обект в PlayerContext. "
        "За визуализация на честотите се създава Web Audio AnalyserNode, свързан към "
        "MediaElementSource. Това позволява лентите в долния плеър да реагират на музиката, "
        "без да се подменят React компонентите при всяка смяна на страница — звукът не се "
        "прекъсва при навигация в SPA.",
    )

    add_h2(doc, "2.4. Обосновка на избора на технологии")
    add_p(
        doc,
        "Изборът не е произволен: той следва възложените ограничения на заданието и "
        "едновременно е подходящ за предметната област. JavaScript и на клиента, и на "
        "сървъра намалява когнитивната цена за учебен проект. React дава компонентния "
        "модел, нужен за сложен UI с плеър и няколко роли. Express е достатъчно прозрачен, "
        "за да се вижда ясно потокът заявка → middleware → маршрут → модел. MongoDB "
        "пасва на документи с вложени масиви (listeningHistory, songs в плейлист) без "
        "тежки join-и. JWT е естествен за SPA, която не разчита на сървърни HTML сесии.",
    )
    add_p(
        doc,
        "Алтернативи като сървърно рендерирани шаблони или монолитен Java стек биха "
        "работили за други задания, но тук изискването е именно React + Express. "
        "Отказът от Redux е съзнателен: Context покрива плеъра и auth състоянието без "
        "излишна абстракция. Отказът от Tailwind запазва контрол чрез един App.css файл, "
        "в който е изграден визуалният език на Pulse.",
    )
    add_p(
        doc,
        "В обобщение теоретичната част показва, че lite стрийминг платформата е "
        "редуциран, но пълен по смисъл модел на реалните услуги, а избраният стек "
        "осигурява всички необходими примитиви: UI, API, персистентност, файлове, "
        "сигурност и аудио възпроизвеждане.",
    )

    def emit_for_chapter(ch: str):
        """Извежда разширените блокове за глава ch (напр. '2', '3')."""
        emitting = False
        for kind, text in list(EXTRA) + list(EXTRA_MORE) + list(EXTRA3):
            if kind in ("h2", "h3"):
                emitting = text.startswith(f"{ch}.")
            if not emitting:
                continue
            if kind == "h2":
                add_h2(doc, text)
            elif kind == "h3":
                add_h3(doc, text)
            else:
                add_p(doc, text)

    emit_for_chapter("2")

    # ---------- 3. АНАЛИЗ ----------
    add_h1(doc, "3. Анализ и проектиране")

    add_h2(doc, "3.1. Функционални и нефункционални изисквания")
    add_p(
        doc,
        "Функционалните изисквания са извлечени от спецификацията на lite платформата и "
        "са реализирани в кода, както следва.",
    )
    add_table_title(doc, "Таблица 2. Основни функционални изисквания")
    add_simple_table(
        doc,
        ["ID", "Изискване", "Къде е реализирано"],
        [
            ["F1", "Регистрация и вход", "routes/auth.js, Login/Register страници"],
            ["F2", "Роли listener/artist/admin", "User.role, middleware requireRole"],
            ["F3", "Каталог и търсене", "GET /api/songs, /search, DiscoverPage"],
            ["F4", "Качване на песен (артист)", "POST /api/songs, StudioPage, Multer"],
            ["F5", "Стрийминг и плеър", "GET /stream, PlayerContext, PlayerBar"],
            ["F6", "Плейлисти CRUD + Like", "routes/playlists.js, Liked Songs"],
            ["F7", "Препоръки", "GET /api/songs/recommendations"],
            ["F8", "Админ статистика и модерация", "routes/admin.js, AdminPage"],
            ["F9", "Профилна снимка", "POST /api/auth/avatar"],
        ],
    )
    add_p(doc, "Нефункционалните изисквания, към които проектът се стреми:")
    add_bullets(
        doc,
        [
            "Сигурност: хеширани пароли, JWT защита на чувствителни маршрути, забрана за саморегистрация като admin.",
            "Удобство: единен плеър, Now Playing изглед, страничен избор на плейлист вместо браузърни prompt диалози.",
            "Производителност при seek: HTTP Range при стрийминг на MP3.",
            "Поддръжка: модулни папки (models, routes, middleware, pages, context), конфигурация чрез .env.",
            "Валидност на данни: проверка на имейл (формат, MX, disposable домейни) при регистрация.",
        ],
    )

    add_h2(doc, "3.2. Роли и права на потребителите")
    add_p(
        doc,
        "Системата разпознава три роли. Слушателят (listener) може да разглежда каталога, "
        "да слуша, да създава плейлисти и да получава препоръки. Артистът (artist) има "
        "всички права на слушател плюс достъп до Studio за качване на песни; името на "
        "изпълнителя се взема от username, с опционално поле „ft.“. Администраторът (admin) "
        "достъпва Admin панела: статистика, скриване/изтриване на песни, смяна на роли и "
        "изтриване на потребители. Регистрационната форма допуска само listener и artist; "
        "admin акаунт се създава извън публичната регистрация (напр. ръчно в базата).",
    )
    add_table_title(doc, "Таблица 3. Матрица на достъпа (опростена)")
    add_simple_table(
        doc,
        ["Действие", "listener", "artist", "admin"],
        [
            ["Слушане / търсене", "Да", "Да", "Да"],
            ["Плейлисти", "Да", "Да", "Да"],
            ["Качване на песен", "Не", "Да", "Да*"],
            ["Админ панел", "Не", "Не", "Да"],
            ["Скриване на чужди песни", "Не", "Не", "Да"],
        ],
    )
    add_p(
        doc,
        "*В кода маршрутите за „моите песни“ и качване допускат artist и admin чрез requireRole. "
        "Практическият фокус на Studio е върху артиста.",
    )

    add_h2(doc, "3.3. Архитектура на системата")
    add_p(
        doc,
        "Архитектурата е класическа клиент–сървър с разделени процеси. Frontend (Vite, порт "
        "5173) е SPA, която говори с Backend (Express, порт 5000) през HTTP JSON API. "
        "Backend се свързва с MongoDB и записва качените файлове в uploads/audio и "
        "uploads/covers (и avatars). Статичните uploads се сервират под /uploads.",
    )
    add_caption(
        doc,
        "Фигура 1. Логическа архитектура: Браузър (React) → REST API (Express) → MongoDB + файлова система",
    )
    add_p(
        doc,
        "На фигура 1 е показан потокът: потребителското действие в UI извиква apiRequest "
        "към /api/..., Express middleware проверява JWT при нужда, маршрутът чете/пише в "
        "Mongoose моделите и връща JSON. За стрийминг браузърният Audio елемент заявява "
        "/api/songs/:id/stream, а сървърът връща байтове с поддръжка на Range.",
    )
    add_p(
        doc,
        "Клиентският слой е организиран в pages (екрани), components (SongList, PlayerBar), "
        "context (Player, Auth/Playlist picker) и api.js (общ fetch с токен). Сървърният "
        "слой следва Express конвенция: index.js регистрира маршрутите; бизнес правилата "
        "са в routes и utils (emailValidation, likedSongs).",
    )

    add_h2(doc, "3.4. Модел на данните")
    add_p(
        doc,
        "Моделът съдържа три колекции. User пази username, email, password (хеш), role, "
        "avatarPath, isEmailVerified и listeningHistory (масив от Song id). Song пази "
        "title, artistName, genre, duration, audioPath, coverPath, uploadedBy, playCount "
        "и isHidden. Playlist пази name, owner, isLikedSongs и songs[].",
    )
    add_caption(
        doc,
        "Фигура 2. Връзки: User 1—* Song (uploadedBy); User 1—* Playlist (owner); Playlist *—* Song; User *—* Song (listeningHistory)",
    )
    add_p(
        doc,
        "Връзката many-to-many между плейлисти и песни е реализирана като масив от "
        "референции в документа Playlist (типичен MongoDB подход), а не чрез отделна "
        "свързваща таблица. Историята на слушане е масив в User, който се обновява при "
        "успешно отчитане на play. Флагът isLikedSongs маркира системния плейлист, който "
        "не се изтрива от потребителя.",
    )
    add_table_title(doc, "Таблица 4. Полета на колекция Song (основни)")
    add_simple_table(
        doc,
        ["Поле", "Тип", "Предназначение"],
        [
            ["title", "String", "Заглавие"],
            ["artistName", "String", "Име за показване (username ± ft.)"],
            ["genre", "String", "Жанр за филтри и препоръки"],
            ["duration", "Number", "Секунди (от music-metadata)"],
            ["audioPath", "String", "Път до MP3"],
            ["coverPath", "String", "Път до обложка"],
            ["uploadedBy", "ObjectId", "Автор (User)"],
            ["playCount", "Number", "Брой слушания"],
            ["isHidden", "Boolean", "Скрита от публичния каталог"],
        ],
    )

    add_h2(doc, "3.5. Основни сценарии на употреба")
    add_p(
        doc,
        "Основните use case сценарии, покрити от системата, са: (1) регистрация като "
        "слушател или артист; (2) вход и запазване на сесия чрез токен в клиента; "
        "(3) разглеждане на Discover с търсене и препоръки; (4) пускане на песен и "
        "управление от долния плеър / Now Playing; (5) създаване на плейлист и добавяне "
        "на песни през страничния picker; (6) качване на песен в Studio; (7) админ "
        "модерация. Тези сценарии направляват и тестовете в глава 5.",
    )
    add_caption(
        doc,
        "Фигура 3. Use case (текстово): Слушател—търси/слуша/плейлисти; Артист—качва; Админ—модерира",
    )
    emit_for_chapter("3")

    # ---------- 4. РЕАЛИЗАЦИЯ ----------
    add_h1(doc, "4. Реализация")

    add_h2(doc, "4.1. Среда за разработка")
    add_p(
        doc,
        "Разработката е извършена под Windows 10/11 с Node.js, редактор Cursor/VS Code, "
        "локална MongoDB инстанция и браузър за ръчни тестове. Бекенд зависимостите са "
        "описани в backend/package.json (express, mongoose, jsonwebtoken, bcryptjs, multer, "
        "cors, dotenv, music-metadata, deep-email-validator и др.). Frontend използва "
        "react 18, react-dom и vite. Стартиране: в backend — npm run dev/start (порт 5000); "
        "във frontend — npm run dev (порт 5173). Конфигурацията включва MONGODB_URI и "
        "JWT_SECRET в backend/.env.",
    )
    add_p(
        doc,
        "Контролът на версиите може да се осъществява с Git; за предаване се изисква архив "
        "с кода и README с инструкции. Структурата на хранилището разделя ясно backend/ и "
        "frontend/, което съответства на двата процеса в runtime.",
    )

    add_h2(doc, "4.2. Модул автентикация и потребители")
    add_p(
        doc,
        "Регистрацията приема username, email, password и role (listener|artist). Сървърът "
        "валидира имейла чрез utils/emailValidation.js (формат, опит за MX проверка, блок "
        "на disposable домейни) и отказва role=admin от публичния endpoint. Паролата се "
        "хешира с bcrypt преди запис. При успех може да се създаде автоматично Liked Songs "
        "плейлист за потребителя.",
    )
    add_p(
        doc,
        "Входът проверява email/password, издава JWT с id на потребителя и връща данни "
        "за UI (без паролата). Клиентът пази токена и го добавя като Bearer при apiRequest. "
        "Маршрутът /api/auth/me връща текущия потребител. Качването на аватар минава през "
        "защитен POST /api/auth/avatar с Multer.",
    )
    add_p(doc, "Ключов фрагмент от защитата на маршрутите (принцип):")
    add_code(
        doc,
        "async function protect(req, res, next) {\n"
        "  const token = req.headers.authorization?.split(' ')[1];\n"
        "  const decoded = jwt.verify(token, process.env.JWT_SECRET);\n"
        "  req.user = await User.findById(decoded.id).select('-password');\n"
        "  next();\n"
        "}",
    )
    add_caption(doc, "Фигура 4. Екран за вход в Pulse (LoginPage)")

    add_h2(doc, "4.3. Модул песни, качване и стрийминг")
    add_p(
        doc,
        "Списъкът GET /api/songs връща публични песни (isHidden=false). Търсенето "
        "поддържа q, genre и artist с case-insensitive регулярни изрази. Препоръките "
        "четат listeningHistory; при празна история сортират по playCount. Качването "
        "POST /api/songs изисква роля artist/admin, приема title, genre, опционално ft., "
        "аудио и обложка. Продължителността се попълва от music-metadata.parseFile.",
    )
    add_p(
        doc,
        "Стриймингът GET /api/songs/:id/stream отваря файла от audioPath. При наличие на "
        "Range хедър се връща 206 Partial Content с соответствуващия байтов интервал — "
        "това е критично за превъртане в плеъра. Отделен POST /play увеличава playCount "
        "и обновява историята на слушане на текущия потребител.",
    )
    add_p(doc, "Илюстративен фрагмент на идеята за Range отговор:")
    add_code(
        doc,
        "if (range) {\n"
        "  // parse start-end, fs.createReadStream({ start, end })\n"
        "  res.status(206);\n"
        "  res.set('Content-Range', `bytes ${start}-${end}/${size}`);\n"
        "}",
    )
    add_caption(doc, "Фигура 5. Studio — форма за качване и списък „Моите песни“")

    add_h2(doc, "4.4. Модул плейлисти и харесани песни")
    add_p(
        doc,
        "Плейлистите са лични за owner. API позволява създаване, зареждане, добавяне и "
        "премахване на песни, изтриване на обикновен плейлист. Системният Liked Songs "
        "(isLikedSongs=true) се създава/гарантира от utils/likedSongs.js и не се трие "
        "като обикновен плейлист. На клиента добавянето към плейлист става през "
        "PlaylistPickerContext — страничен панел, вместо window.prompt.",
    )
    add_caption(doc, "Фигура 6. Страница Плейлисти с избор и списък песни")

    add_h2(doc, "4.5. Плеър и клиентски интерфейс")
    add_p(
        doc,
        "PlayerContext държи queue, currentIndex, isPlaying, repeat (off|one|all), "
        "currentTime, duration и bars за визуализация. playSong зарежда опашка и вика "
        "playAtIndex, който задава audio.src към stream URL. Навигацията между страници "
        "не унищожава Audio обекта, затова музиката продължава. Now Playing е "
        "пълноекранен изглед с обложка и контроли; отварянето му при клик върху текущата "
        "песен не я спира — само превключва UI режима. Долната лента PlayerBar остава "
        "видима извън Now Playing.",
    )
    add_p(
        doc,
        "Визуалният дизайн следва тъмна тема със зелен акцент, странично меню и шрифт "
        "Outfit. Началната страница е intro за марката Pulse; каталогът е в Discover. "
        "SongList поддържа редове и карти, с отделно поведение за „отвори в player mode“ "
        "и бутон play/pause.",
    )
    add_caption(doc, "Фигура 7. Долен плеър с визуализация и метаданни на текущата песен")
    add_caption(doc, "Фигура 8. Now Playing изглед")

    add_h2(doc, "4.6. Админ панел и модерация")
    add_p(
        doc,
        "Маршрутите под /api/admin са защитени с requireRole('admin'). Админът вижда "
        "агрегирана статистика (потребители, песни, плейлисти, скрити песни, топ по "
        "слушания), може да скрива/показва или изтрива песни и да управлява потребители "
        "(смяна на роля, изтриване). Frontend страницата AdminPage организира тези "
        "действия в раздели. Скритите песни не се появяват в публичния каталог и търсене.",
    )
    add_caption(doc, "Фигура 9. Админ панел — статистика и модерация")

    add_h2(doc, "4.7. Нефункционални изисквания в реализацията")
    add_p(
        doc,
        "Сигурността е осигурена чрез bcrypt, JWT, ролеви guards и отказ на admin при "
        "регистрация. Валидациите на входните данни връщат съобщения на български език. "
        "CORS е включен за връзка между портове 5173 и 5000 в dev среда. Удобството се "
        "подкрепя от запазен плеър, понятни роли в UI и предотвратяване на изтриване на "
        "Liked Songs. Ограничението „lite“ е спазено: няма платежен модул, няма външен "
        "CDN и няма сложен ML пайплайн за препоръки.",
    )
    emit_for_chapter("4")

    # ---------- 5. ТЕСТВАНЕ ----------
    add_h1(doc, "5. Тестване, резултати и демонстрация")

    add_h2(doc, "5.1. Подход за тестване")
    add_p(
        doc,
        "Тестването е предимно ръчно, което е адекватно за учебен full-stack проект с "
        "фокус върху интеграции. Проверяват се щастливи пътища и основни негативни "
        "случаи (грешна парола, достъп без токен, качване без роля artist). Използват "
        "се тестови акаунти в локалната база и реални MP3/обложки през Studio. API "
        "здравето се проверява чрез /api/health и наблюдаване на мрежовите заявки в "
        "браузърските инструменти за разработчици.",
    )

    add_h2(doc, "5.2. Тестови случаи")
    add_table_title(doc, "Таблица 5. Примерни тестови случаи")
    add_simple_table(
        doc,
        ["№", "Стъпки", "Очакван резултат", "Резултат"],
        [
            ["T1", "Регистрация listener с валиден имейл", "Акаунт създаден, вход возможен", "Успех"],
            ["T2", "Регистрация с role admin", "Отказ от сървъра", "Успех"],
            ["T3", "Вход с грешна парола", "Грешка, няма токен", "Успех"],
            ["T4", "Артист качва MP3 + обложка", "Песента е в Studio и Discover", "Успех"],
            ["T5", "Пусни песен и seek в средата", "Звукът продължава от избраната позиция", "Успех"],
            ["T6", "Отвори Now Playing по време на play", "Песента не спира", "Успех"],
            ["T7", "Добави песен в плейлист", "Вижда се в плейлиста", "Успех"],
            ["T8", "Админ скрива песен", "Изчезва от публичния каталог", "Успех"],
            ["T9", "Listener отваря /studio", "Няма достъп / няма Studio в менюто", "Успех"],
            ["T10", "Препоръки без история", "Връщат се популярни песни", "Успех"],
        ],
    )
    add_p(
        doc,
        "Таблица 5 показва, че критичните потоци — автентикация, качване, стрийминг, "
        "плейлисти, ролеви достъп и модерация — са преминати успешно в локална среда. "
        "Допълнителни UI корекции (напр. показване на пълни заглавия в Studio, "
        "непрекъснато възпроизвеждане при вход в Now Playing) са проверени след "
        "отстраняване на съответните дефекти.",
    )
    add_caption(doc, "Фигура 10. Демонстрационен поток: Discover → play → Now Playing")

    add_h2(doc, "5.3. Ограничения и бъдещо развитие")
    add_p(
        doc,
        "Известни ограничения: системата е lite и локална; няма облачен обектен сторидж; "
        "препоръките са евристични; липсват абонаменти, офлайн режим, мобилни native "
        "приложения и автоматизиран CI тестов набор. Качеството на стрийминга зависи от "
        "локалния диск и мрежата на учебната машина. Няма отделна entity „албум“ — "
        "песните са плосък каталог.",
    )
    add_p(
        doc,
        "Възможни разширения: албуми и многодискови издания; облачно хранилище; "
        "по-богати препоръки; пагиниране на каталога; автоматични unit/integration "
        "тестове; rate limiting и hardening за публичен деплой.",
    )
    emit_for_chapter("5")

    # ---------- 6. ЗАКЛЮЧЕНИЕ ----------
    add_h1(doc, "6. Заключение")
    add_p(
        doc,
        "Настоящият проект реализира работеща lite музикална стрийминг платформа Pulse "
        "върху стека React (Vite) + Express + MongoDB. Поставената в увода цел е "
        "постигната: потребителите се регистрират и влизат с роли, артистите качват "
        "песни, слушателите ползват каталог, търсене, препоръки, плейлисти и плеър, а "
        "администраторът разполага с модерация и статистика.",
    )
    add_p(
        doc,
        "Спрямо задачите: REST бекендът и моделите са изградени; JWT автентикацията и "
        "имейл валидацията работят; Multer качването и Range стриймингът са налични; "
        "React клиентът включва глобален плеър и ролево меню; Liked Songs и препоръките "
        "са внедрени; основните сценарии са ръчно тествани и документирани.",
    )
    add_p(
        doc,
        "Личните изводи от разработката включват значението на ясното разделяне "
        "клиент/сървър, нуждата от един стабилен аудио обект за непрекъснато слушане в "
        "SPA и ползата от ранно дефиниране на роли, за да не се смесват правата в UI. "
        "Срещнатите дефекти (напр. грешен CSS грид в Studio, пауза при отваряне на "
        "Now Playing) показаха, че интеграционното поведение на UI е толкова важно, "
        "колкото и коректността на API.",
    )
    add_p(
        doc,
        "За бъдещо развитие са посочени албуми, по-мащабируемо файлово хранилище, "
        "автоматизирани тестове и по-сложни препоръки — без да се нарушава учебният "
        "характер на текущата lite версия.",
    )
    add_p(
        doc,
        "Работата по lite стрийминг платформата показва, че дори без комерсиални "
        "подсистеми може да се изгради завършен вертикален срез: от байтове на диска "
        "до визуализация в браузъра. Най-ценният учебен резултат е връзката между "
        "роли, API защита и UI навигация — три слоя на една и съща политика за достъп.",
    )
    add_p(
        doc,
        "Вторият ценен резултат е осъзнаването, че мултимедийният клиент има скрити "
        "изисквания (непрекъснатост на звука, Range, единен Audio), които не се виждат "
        "в обикновените CRUD приложения. Третият е дисциплината на стека: ограниченията "
        "не са пречка, а рамка, която държи проекта защитим в срок.",
    )
    add_p(
        doc,
        "В крайна сметка теоретичната писмена защита и работещото приложение Pulse "
        "образуват единен дипломен продукт: кодът доказва изпълнимост, а текстът доказва "
        "разбиране. Без кода защитата би била абстрактна; без защитата кодът би останал "
        "необяснен набор от файлове. Двете заедно отговарят на методическите указания "
        "на Професионална гимназия по компютърни науки и математически анализи "
        "„Проф. Минко Балкански“ – Стара Загора.",
    )
    add_p(
        doc,
        "Препоръка към следващи итерации на същия учебен продукт е да се запази ясната "
        "модулност и да се добавят автоматични тестове за auth и stream преди нови UI "
        "експерименти. Така регресиите около плеъра и ролите ще се хващат по-рано, а "
        "демонстрацията пред комисия ще остане стабилна.",
    )
    add_p(
        doc,
        "Обобщено по задачите от увода: REST бекенд с модели — изпълнено; JWT и роли с "
        "имейл валидация — изпълнено; качване и Range стрийминг — изпълнено; React "
        "клиент с глобален плеър — изпълнено; Liked Songs и препоръки — изпълнено; "
        "тестове и документация — изпълнено в рамките на ръчния подход. Следователно "
        "целта на проекта е постигната в заявения lite обхват.",
    )
    add_p(
        doc,
        "Авторът осъзнава, че писмената защита е жив документ: при добавяне на нови "
        "модули (например албуми) съответните раздели трябва да се актуализират, а "
        "скрийншотите в приложенията — да се подменят с актуални. До крайния срок "
        "15.09.2026 г. настоящата версия отразява състоянието на кода към момента на "
        "изготвяне на защитата.",
    )
    add_p(
        doc,
        "С това завършва основното изложение. Следват списъкът с използвана литература "
        "и приложенията, които не участват в минималния обем от тридесет стандартни "
        "страници, но са задължителни елементи на комплекта за предаване.",
    )

    # ---------- ЛИТЕРАТУРА ----------
    add_h1(doc, "Използвана литература")
    refs = [
        "1. Spotify AB. Spotify — About. https://www.spotify.com (последен достъп: 12.09.2026).",
        "2. Google. YouTube Music. https://music.youtube.com (последен достъп: 12.09.2026).",
        "3. SoundCloud Limited. SoundCloud. https://soundcloud.com (последен достъп: 12.09.2026).",
        "4. Meta Open Source. React Documentation. https://react.dev (последен достъп: 12.09.2026).",
        "5. OpenJS Foundation. Express — Node.js web application framework. https://expressjs.com (последен достъп: 12.09.2026).",
        "6. MongoDB, Inc. MongoDB Manual / Mongoose. https://www.mongodb.com/docs ; https://mongoosejs.com/docs (последен достъп: 12.09.2026).",
        "7. Auth0 / jwt.io. JSON Web Tokens Introduction. https://jwt.io/introduction (последен достъп: 12.09.2026).",
        "8. MDN Web Docs. Using the Web Audio API. https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API (последен достъп: 12.09.2026).",
        "9. MDN Web Docs. HTTP range requests. https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests (последен достъп: 12.09.2026).",
        "10. Vite Team. Vite Documentation. https://vitejs.dev (последен достъп: 12.09.2026).",
    ]
    for r in refs:
        p = doc.add_paragraph()
        style_para(p, align="justify", first_indent=False, space_after=6)
        run = p.add_run(r)
        set_run_font(run, 12)

    # ---------- ПРИЛОЖЕНИЯ ----------
    add_h1(doc, "Приложения")
    add_h2(doc, "Приложение А. Структура на проекта")
    add_p(
        doc,
        "Основни папки: backend/ (index.js, config/, models/, routes/, middleware/, utils/, "
        "uploads/); frontend/src/ (App.jsx, App.css, api.js, pages/, components/, context/). "
        "Пълният изходен код се предава като архив заедно с README инструкции за npm install "
        "и стартиране на двата сървъра и на MongoDB.",
    )
    add_h2(doc, "Приложение Б. Допълнителни екранни снимки")
    add_p(
        doc,
        "Препоръчително е към хартиения/електронния екземпляр да се приложат четливи "
        "скрийншоти на: начална страница Pulse; Discover с резултати от търсене; Studio "
        "след качване; плейлист Liked Songs; Admin статистика; Now Playing. В основния "
        "текст фигурите 4–10 са реферирани описателно; пълноразмерните изображения се "
        "поставят тук при финалното оформяне преди предаване.",
    )
    add_h2(doc, "Приложение В. Инструкции за стартиране (резюме)")
    add_bullets(
        doc,
        [
            "Стартирай MongoDB локално и настрой MONGODB_URI в backend/.env.",
            "cd backend → npm install → npm start (http://localhost:5000).",
            "cd frontend → npm install → npm run dev (http://localhost:5173).",
            "Регистрирай listener/artist или използвай подготвени тестови акаунти в локалната база.",
        ],
    )

    doc.save(OUT)
    print(f"Written: {OUT}")


if __name__ == "__main__":
    build()
