# Kế hoạch tái cấu trúc và sửa lỗi Trade Calendar

## 1. Thông tin tài liệu

- Phạm vi chính: `src/ui/TradeCalendarView.tsx`.
- Phạm vi liên quan: `src/economicCalendar/api.ts`, `src/economicCalendar/calendar.ts`, test và CSS của Trade Calendar.
- Mục tiêu: sửa các lỗi đã phát hiện, giảm kích thước file, tăng khả năng kiểm thử và giữ nguyên API public của plugin.
- Ngoài phạm vi: thay đổi schema note, command ID, plugin ID, thiết kế tổng thể của dashboard hoặc thêm dịch vụ mạng mới.

## 2. Tóm tắt hiện trạng

`TradeCalendarView.tsx` hiện chứa khoảng 1.340 dòng và đảm nhiệm nhiều trách nhiệm cùng lúc:

- Đăng ký và mở Obsidian `ItemView`.
- Quản lý snapshot trade và plan.
- Theo dõi ngôn ngữ và settings.
- Tải, lọc và hiển thị lịch kinh tế.
- Quản lý ngày hiện tại, tháng đang xem, ngày đang chọn và thao tác scroll.
- Render calendar tháng, calendar ngang, day panel, trade card và plan card.
- Chứa các hàm xử lý ngày tháng và biến đổi snapshot.

Cấu trúc này khiến thay đổi ở một luồng dễ ảnh hưởng luồng khác, đồng thời các hàm quan trọng khó unit test vì nằm chung với React và Obsidian API.

## 3. Mục tiêu sau tái cấu trúc

1. View vẫn được đăng ký với type `trader-journal-calendar` và các import hiện tại không bị vỡ.
2. Lịch kinh tế tự cập nhật theo thời gian và tự tải dữ liệu tuần mới khi view mở lâu.
3. Không hiển thị lỗi giả khi nhiều consumer cùng yêu cầu một tuần hoặc settings thay đổi trong lúc request đang chạy.
4. Khi chuyển tháng, ngày được chọn và day panel luôn đồng bộ với tháng đang hiển thị.
5. Mỗi module có một trách nhiệm rõ ràng; ưu tiên giữ file dưới khoảng 200–300 dòng.
6. Logic ngày tháng, lọc snapshot, điều hướng và request deduplication có unit test.
7. Không tăng số request không cần thiết và vẫn giữ lịch kinh tế là tính năng opt-in.

## 4. Vấn đề và hướng giải quyết

### 4.1. Lịch kinh tế không tự tải tuần mới

#### Hiện trạng

Effect tải dữ liệu chỉ chạy khi `economicSettingsVersion` hoặc `plugin` thay đổi. Timer qua nửa đêm chỉ cập nhật `today`, vì vậy một calendar view mở qua tuần mới vẫn giữ snapshot của tuần trước.

#### Tác động

- Calendar có thể không có tin của tuần hiện tại.
- Dữ liệu chỉ đúng lại khi người dùng đổi setting, đóng/mở view hoặc reload plugin.
- Hành vi đặc biệt dễ nhận thấy với Obsidian được mở liên tục nhiều ngày.

#### Hướng giải quyết

- Tạo clock dùng chung cho calendar, cung cấp ít nhất:
  - `now`: timestamp hiện tại, làm tròn theo phút.
  - `today`: ngày local của người dùng.
  - `economicWeekKey`: week key theo timezone của nguồn dữ liệu kinh tế.
- Tách effect tải dữ liệu khỏi effect áp dụng bộ lọc.
- Chỉ gọi `loadThisWeek()` khi:
  - tính năng vừa được bật;
  - `economicWeekKey` thay đổi;
  - người dùng thực hiện retry chủ động, nếu sau này có nút retry.
- Thay đổi country, impact, timezone hiển thị hoặc `showAll` chỉ lọc lại raw events; không gửi request mới vì response của nguồn không phụ thuộc các setting này.
- Dùng một timeout được cleanup đúng cách để đánh thức clock tại mốc cần thiết, không dùng polling tần suất cao.

#### Tiêu chí nghiệm thu

- Giữ view mở qua ranh giới tuần sẽ tải snapshot tuần mới đúng một lần.
- Đổi country, impact hoặc timezone không tạo network request mới.
- Tắt lịch kinh tế sẽ xóa state hiển thị và không tạo request.

### 4.2. Sự kiện đã xảy ra vẫn được coi là sự kiện tương lai

#### Hiện trạng

`economicCalendarNow` được khởi tạo lúc component mount và chỉ cập nhật khi chọn **Today**. Bộ lọc `Date.parse(event.date) > now` vì vậy sử dụng timestamp cũ nếu view được mở lâu.

#### Tác động

- Event đã qua vẫn có dot trên calendar.
- Day panel vẫn hiển thị event không còn thuộc danh sách sắp tới.
- Trạng thái UI phụ thuộc vào việc người dùng có chọn **Today** hay không.

#### Hướng giải quyết

- Loại bỏ state `economicCalendarNow` riêng lẻ.
- Dùng `now` từ calendar clock.
- Cập nhật `now` tại biên phút kế tiếp; độ chính xác một phút đủ cho UI chỉ hiển thị giờ và phút.
- Có thể tối ưu thêm bằng cách lên lịch tới event gần nhất, nhưng chưa cần trong lần sửa đầu vì làm tăng độ phức tạp.
- Khi `economicCalendarShowAll` là `true`, vẫn cho clock chạy chung nhưng memo lọc không loại event đã qua.

#### Tiêu chí nghiệm thu

- Sau khi thời gian event đi qua, event biến mất trong tối đa một phút khi `showAll` tắt.
- Không cần click **Today** hoặc đổi setting để UI cập nhật.
- Timer được cleanup khi view đóng hoặc plugin unload.

### 4.3. Race condition khi tải lịch kinh tế

#### Hiện trạng

Khi effect chạy lại, cleanup đánh dấu request cũ là `disposed` và effect mới gọi `loadThisWeek()`. Trong service, cooldown được kiểm tra trước khi pending request được tái sử dụng. Consumer mới có thể nhận lỗi cooldown, trong khi request đầu tiên vẫn chạy và kết quả của nó đã bị consumer cũ bỏ qua.

Các tình huống có thể kích hoạt:

- Settings thay đổi trong lúc request đầu đang chạy.
- Có nhiều calendar view cùng mount gần nhau.
- Development build dùng React `StrictMode` chạy lại effect để kiểm tra cleanup.

#### Tác động

- UI hiển thị lỗi dù request thực tế hoàn thành và cache đã được lưu.
- Có thể phải đóng/mở view mới thấy dữ liệu.
- Trạng thái loading/error không phản ánh đúng trạng thái của service.

#### Hướng giải quyết

Ở `EconomicCalendarService`:

1. Theo dõi pending request cùng `weekKey`, thay vì chỉ giữ một promise không có danh tính.
2. Nếu đã có pending request cho cùng `weekKey`, trả lại chính promise đó trước khi kiểm tra cooldown.
3. Chỉ áp dụng cooldown khi chuẩn bị tạo một network request mới.
4. Xóa pending entry trong `finally`, nhưng chỉ xóa đúng promise/week đang hoàn thành.

Ở React hook:

1. Một consumer unmount hoặc effect cleanup chỉ ngăn việc set state của consumer đó; không hủy request dùng chung của service.
2. Giữ dữ liệu cũ trong lúc refresh nếu đã có snapshot hợp lệ.
3. Chỉ hiển thị trạng thái lỗi toàn phần khi chưa có dữ liệu nào. Nếu refresh thất bại nhưng còn snapshot cũ, tiếp tục hiển thị dữ liệu và có thể thêm trạng thái stale không gây gián đoạn.
4. Không tải lại khi chỉ thay đổi setting lọc như đã nêu ở mục 4.1.

#### Tiêu chí nghiệm thu

- Hai lệnh `loadThisWeek()` đồng thời cho cùng tuần chỉ tạo một request mạng và cùng nhận kết quả.
- Thay đổi setting lọc trong lúc request chạy không chuyển UI sang lỗi cooldown.
- Strict Mode development không tạo lỗi giả hoặc request trùng.
- Request mới thực sự trong thời gian cooldown vẫn tuân thủ giới hạn đã định.

### 4.4. Chuyển tháng nhưng ngày được chọn vẫn thuộc tháng cũ

#### Hiện trạng

`goToAdjacentMonth()` chỉ cập nhật `visibleMonth`. `selectedDate` và day panel không đổi, nên tháng mới có thể không có ô selected nhưng panel vẫn hiển thị dữ liệu của tháng trước.

#### Tác động

- Header, grid và day panel không biểu diễn cùng một ngữ cảnh.
- Người dùng có thể hiểu nhầm số trade/plan đang xem thuộc ngày trong tháng mới.
- Calendar ngang và calendar tháng có thể xử lý scroll khác nhau cho cùng thao tác.

#### Hướng giải quyết

- Xây dựng helper thuần `moveSelectedDateToMonth(selectedDate, targetMonth)`.
- Giữ nguyên ngày trong tháng khi có thể; nếu ngày không tồn tại thì clamp về ngày cuối tháng.
- Ví dụ:
  - `2026-01-15` → tháng kế tiếp → `2026-02-15`.
  - `2026-01-31` → tháng kế tiếp → `2026-02-28`.
  - Năm nhuận: `2028-01-31` → `2028-02-29`.
- Khi chuyển tháng, cập nhật `visibleMonth` và `selectedDate` trong cùng handler.
- Hợp nhất ba state scroll request hiện tại thành một scroll intent rõ nghĩa, ví dụ `{ date, align, requestId }`, để tránh nhiều effect cùng cạnh tranh gọi `scrollIntoView()`.
- Với calendar ngang, scroll tới ngày mới được chọn. Với calendar tháng, chỉ cần cập nhật highlight và panel.

#### Tiêu chí nghiệm thu

- Sau khi chọn tháng trước/sau, luôn có đúng một ngày selected trong tháng đang hiển thị.
- Day panel luôn phản ánh ngày selected đó.
- Điều hướng qua tháng có 28, 29, 30 và 31 ngày không tạo ngày không hợp lệ.

### 4.5. Cấu trúc file quá lớn và trách nhiệm bị trộn

#### Hiện trạng

Lifecycle Obsidian, React state, data loading, presentational components và date utilities cùng nằm trong một file khoảng 1.340 dòng.

#### Tác động

- Khó review và khó xác định phạm vi ảnh hưởng của thay đổi.
- Helper quan trọng khó import vào test mà không kéo theo React/Obsidian runtime.
- File vượt xa convention 200–300 dòng của project.

#### Hướng giải quyết

Giữ `src/ui/TradeCalendarView.tsx` làm facade tương thích ngược, sau đó tách thành cấu trúc dự kiến:

```text
src/ui/
  TradeCalendarView.tsx                 # Constants, register/open view, React root lifecycle
  tradeCalendar/
    TradeCalendar.tsx                   # Container và phối hợp các hook
    types.ts                            # UI-local types
    calendarDates.ts                    # Date/month helpers thuần
    calendarSnapshot.ts                 # Filter và lookup helpers thuần
    hooks/
      useCalendarClock.ts               # now, today, economicWeekKey
      useCalendarData.ts                # Trade/plan snapshot subscription
      useCalendarSettings.ts            # Workspace settings/language events
      useEconomicCalendar.ts            # Load/error/filter lifecycle
      useHorizontalCalendarScroll.ts    # Một scroll intent duy nhất
    components/
      CalendarHeader.tsx
      MonthCalendar.tsx
      HorizontalCalendar.tsx
      CalendarDateButton.tsx
      CalendarDotSummary.tsx
      CalendarDayPanel.tsx
      EconomicCalendarSection.tsx
      EconomicCalendarCard.tsx
      PlanCalendarCard.tsx
      TradeCalendarCard.tsx
      CalendarIconButton.tsx
```

Không bắt buộc mọi file phải được tạo ngay nếu component quá nhỏ. Ưu tiên ranh giới theo trách nhiệm, tránh tạo file chỉ có vài dòng mà không cải thiện khả năng đọc hoặc test.

### 4.6. Vấn đề phụ nên xử lý trong cùng đợt

#### Interactive control lồng nhau

Trade card và plan card dùng `div role="button"` bao quanh các button edit/review. Cấu trúc interactive lồng nhau gây khó hiểu cho screen reader và điều hướng bàn phím.

Hướng xử lý:

- Không biến toàn bộ container thành `role="button"`.
- Dùng một button/link riêng cho vùng mở note, đặt cạnh các action button.
- Giữ action edit/review là button độc lập với accessible label.
- Bổ sung `aria-pressed` hoặc `aria-current="date"` cho ngày đang chọn/phần tử hôm nay khi phù hợp.

#### Ngôn ngữ của linked trade có thể bị cũ

Plan card hiển thị `trade.side`, trong khi giá trị này đã được format theo ngôn ngữ tại thời điểm index. Khi đổi ngôn ngữ, card trade chính format lại từ raw value nhưng linked trade trong plan card có thể vẫn dùng chuỗi cũ.

Hướng xử lý:

- Trong presentational component, luôn format từ `trade.trade.side` cùng `language` hiện tại.
- Về dài hạn, calendar index nên ưu tiên lưu normalized/raw data; việc dịch thuộc tầng UI.

## 5. Kiến trúc dữ liệu và state đề xuất

### 5.1. Phân quyền sở hữu state

| State | Nơi sở hữu | Ghi chú |
| --- | --- | --- |
| Trade/plan snapshot | `useCalendarData` | Subscribe một lần và cleanup khi unmount. |
| Ngôn ngữ/display settings | `useCalendarSettings` | Nhận workspace events. |
| `now`, `today`, week key | `useCalendarClock` | Một timer có cleanup. |
| Raw economic events/loading/error | `useEconomicCalendar` | Không trộn với filter UI. |
| Filtered/grouped economic events | memo trong hook/container | Tính từ raw events, settings và `now`. |
| `selectedDate`, `visibleMonth`, filter | `TradeCalendar` container | Là state điều hướng của view. |
| Scroll intent | `useHorizontalCalendarScroll` | Không dùng ba counter/target tách rời. |

### 5.2. Luồng lịch kinh tế mục tiêu

```text
enable hoặc week key thay đổi
  → EconomicCalendarService.loadThisWeek(weekKey)
  → reuse pending request cùng week
  → cập nhật raw events
  → filter theo country/impact/showAll/now
  → group theo timezone hiển thị
  → render dot và day panel
```

Thay đổi country/impact/timezone/showAll bắt đầu từ bước filter, không quay lại bước network.

## 6. Lộ trình triển khai

### Giai đoạn 1: khóa hành vi bằng test

1. Tách date helpers và snapshot helpers sang module thuần mà chưa thay đổi hành vi.
2. Thêm test cho:
   - tạo ngày của tháng và grid 42 ô;
   - cộng/trừ tháng;
   - clamp selected date khi đổi tháng;
   - lọc trade snapshot theo journal type;
   - auto-select date hiện tại/gần nhất.
3. Chạy lint, test và build để xác nhận refactor cơ học không đổi output.

### Giai đoạn 2: sửa service lịch kinh tế

1. Gắn `weekKey` vào pending request.
2. Deduplicate request cùng tuần trước khi kiểm tra cooldown.
3. Thêm unit test cho concurrent callers, cache hit, cooldown và request failure.
4. Đảm bảo không thay đổi URL, opt-in setting hoặc dữ liệu gửi ra ngoài.

### Giai đoạn 3: tách hook clock và economic calendar

1. Tạo `useCalendarClock` với timer căn theo biên phút.
2. Tạo `useEconomicCalendar` và tách load khỏi filter.
3. Reload khi week key thay đổi.
4. Giữ snapshot cũ trong lúc refresh và cleanup set-state an toàn.
5. Test các helper tính delay/week transition bằng fake clock hoặc truyền `now` tường minh.

### Giai đoạn 4: sửa điều hướng và scroll

1. Áp dụng `moveSelectedDateToMonth` trong điều hướng tháng.
2. Hợp nhất scroll state thành một intent.
3. Test January/February, leap year, year boundary và chọn ngày muted của grid.
4. Manual test cả hai display mode.

### Giai đoạn 5: tách component và cải thiện accessibility

1. Tách header, calendars, day panel và card components.
2. Loại interactive control lồng nhau.
3. Format linked trade từ raw value theo ngôn ngữ hiện tại.
4. Giữ CSS class hiện tại nếu không có lý do thay đổi để giảm regression giao diện.
5. Chỉ đổi CSS tại những vùng cần hỗ trợ cấu trúc DOM mới.

### Giai đoạn 6: xác minh và dọn dẹp

1. Xóa helper/state/effect không còn dùng.
2. Kiểm tra circular imports.
3. Chạy toàn bộ quality gates.
4. Manual test trong Obsidian desktop và, nếu có thiết bị, mobile.

## 7. Kế hoạch kiểm thử

### 7.1. Unit tests

#### Điều hướng ngày tháng

- Chuyển tháng tiến/lùi giữ nguyên day-of-month khi hợp lệ.
- Clamp ngày 29/30/31 đúng theo target month.
- Chuyển December ↔ January đúng năm.
- Leap year và non-leap year.
- `today` cập nhật qua local midnight.
- Week key thay đổi đúng theo timezone nguồn.

#### Lịch kinh tế

- Event tương lai được giữ lại khi `showAll=false`.
- Event đúng bằng hoặc trước `now` bị loại.
- `showAll=true` giữ mọi event.
- Country và impact filter không phân biệt chữ hoa/thường theo quy tắc hiện tại.
- Group event đúng theo configured timezone.
- Hai caller cùng tuần dùng chung pending promise/request.
- Cache đúng tuần không tạo request.
- Cooldown chỉ chặn việc tạo request mới, không chặn caller tham gia pending request.
- Request lỗi đặt đúng error state và request sau có thể retry.

#### Snapshot/calendar helpers

- Live và backtest không lẫn nhau.
- Plan/trade lookup giữ đúng thứ tự.
- Auto selection không trả về ngày không hợp lệ.

### 7.2. Integration tests

- Mount calendar khi economic calendar tắt: không gọi mạng.
- Bật economic calendar: tải một lần và hiển thị loading → data.
- Đổi country/impact/timezone: lọc lại nhưng không tải lại.
- Mô phỏng week rollover: gọi tải tuần mới một lần.
- Unmount trong lúc request chạy: không set state sau unmount.
- Hai view mount đồng thời: một request mạng.

Nếu test runner hiện tại không có DOM environment, ưu tiên đưa state transition vào reducer/helper thuần. Chỉ thêm `jsdom` khi integration test React thực sự mang lại giá trị đủ lớn, tránh tăng dependency không cần thiết.

### 7.3. Manual test trong Obsidian

1. Mở calendar từ command và ribbon.
2. Chuyển qua lại month/horizontal mode.
3. Chuyển tháng từ ngày 31 sang tháng ngắn hơn.
4. Chọn ngày muted ở đầu/cuối month grid.
5. Chọn **Today** và kiểm tra scroll ở calendar ngang.
6. Bật lịch kinh tế khi chưa có cache.
7. Đổi filter ngay trong lúc request đang chạy.
8. Đóng/mở view trong lúc request chạy.
9. Xác nhận event vừa qua biến mất sau tối đa một phút khi `showAll` tắt.
10. Đổi ngôn ngữ và kiểm tra trade, linked trade, status và accessible label.
11. Dùng bàn phím để mở note, edit plan/trade và review trade.
12. Disable/re-enable plugin để kiểm tra timer/listener được cleanup.

## 8. Quality gates

Mỗi giai đoạn phải pass:

```bash
npm run lint
npm test
npm run build
```

Trước khi hoàn tất cần kiểm tra thêm:

- Không thay đổi command ID hoặc view type.
- Không thêm network call khi setting economic calendar đang tắt.
- Không commit `main.js`, `node_modules/` hoặc artifact sinh tự động.
- Không thêm dependency lớn nếu có thể giải quyết bằng TypeScript/React hiện có.
- Mọi timer, event listener và subscription đều có cleanup.

## 9. Rủi ro và cách giảm thiểu

| Rủi ro | Cách giảm thiểu |
| --- | --- |
| Refactor lớn gây regression UI | Tách helper trước, giữ CSS class và markup chính ổn định, thay đổi từng giai đoạn. |
| Timer tạo render quá nhiều | Cập nhật theo biên phút, không theo giây. |
| Nhiều view tạo request trùng | Deduplicate tại service theo week key, không chỉ tại component. |
| Cooldown che khuất dữ liệu tuần mới | Phân biệt join pending request với tạo request mới; giữ snapshot cũ khi refresh lỗi. |
| Timezone local khác timezone nguồn | Tách `today` local và `economicWeekKey` theo source timezone. |
| Scroll effects cạnh tranh | Dùng một scroll intent và một effect sở hữu `scrollIntoView`. |
| Thay DOM làm vỡ CSS | Giữ class hiện có, visual regression test thủ công cả light/dark theme. |

## 10. Danh sách file dự kiến thay đổi

### File hiện có

- `src/ui/TradeCalendarView.tsx`: thu gọn thành facade/lifecycle.
- `src/economicCalendar/api.ts`: deduplicate request theo week key và sửa thứ tự cooldown.
- `src/economicCalendar/calendar.ts`: giữ các hàm lọc/group thuần; bổ sung helper nếu cần.
- `styles.css`: chỉ chỉnh khi tách interactive area của card.
- `scripts/run-tests.mjs`: đăng ký các test suite mới nếu runner yêu cầu.

### File mới dự kiến

- `src/ui/tradeCalendar/TradeCalendar.tsx`.
- `src/ui/tradeCalendar/types.ts`.
- `src/ui/tradeCalendar/calendarDates.ts`.
- `src/ui/tradeCalendar/calendarSnapshot.ts`.
- `src/ui/tradeCalendar/hooks/useCalendarClock.ts`.
- `src/ui/tradeCalendar/hooks/useCalendarData.ts`.
- `src/ui/tradeCalendar/hooks/useCalendarSettings.ts`.
- `src/ui/tradeCalendar/hooks/useEconomicCalendar.ts`.
- `src/ui/tradeCalendar/hooks/useHorizontalCalendarScroll.ts`.
- Các component trong `src/ui/tradeCalendar/components/` theo nhu cầu thực tế.
- Test tương ứng trong cấu trúc test hiện tại của project.

## 11. Definition of done

Đợt tái cấu trúc được xem là hoàn thành khi:

- Bốn lỗi chính trong mục 4.1–4.4 có test hoặc kịch bản manual test tái hiện và xác nhận đã sửa.
- `TradeCalendarView.tsx` chỉ còn lifecycle/public API và không còn là component nguyên khối.
- Logic ngày tháng và economic calendar có thể kiểm thử độc lập với DOM Obsidian.
- Không có duplicate network request cho cùng tuần đang pending.
- View tự chuyển sang dữ liệu tuần mới và loại event đã qua mà không cần thao tác người dùng.
- Tháng hiển thị, ngày selected và day panel luôn đồng bộ.
- Không còn interactive control lồng nhau trong trade/plan cards.
- `npm run lint`, `npm test` và `npm run build` đều pass.
- Manual test trong Obsidian không phát hiện regression ở month mode, horizontal mode, light theme hoặc dark theme.

## 12. Thứ tự ưu tiên đề xuất

1. Viết test và tách helper thuần.
2. Sửa request deduplication/cooldown trong economic calendar service.
3. Thêm calendar clock và tự refresh tuần/event.
4. Đồng bộ selected date khi chuyển tháng và hợp nhất scroll intent.
5. Tách component, sửa accessibility và xử lý chuỗi dịch bị stale.
6. Chạy quality gates và manual regression test.

Thứ tự này ưu tiên sửa tính đúng đắn trước, nhưng vẫn đặt test và ranh giới module làm nền để các thay đổi hành vi sau đó có thể được kiểm chứng an toàn.

## 13. Trạng thái triển khai

Cập nhật ngày 2026-08-20:

- [x] Tách helper ngày tháng và snapshot thành module thuần.
- [x] Thêm test cho grid tháng, leap year, clamp ngày, clock và snapshot filter.
- [x] Deduplicate economic calendar request theo week key.
- [x] Sửa cooldown để caller dùng chung pending request và không mang cooldown tuần cũ sang tuần mới.
- [x] Tách calendar clock, data/settings subscription, economic calendar và horizontal scroll thành hook riêng.
- [x] Tự cập nhật `now` theo phút và reload khi source week thay đổi.
- [x] Đồng bộ `selectedDate` khi chuyển tháng và hợp nhất scroll intent.
- [x] Tách facade, container, day panel, date buttons và card components.
- [x] Loại interactive control lồng nhau và bổ sung trạng thái ARIA cho ngày.
- [x] Format linked-trade side theo ngôn ngữ hiện tại.
- [x] Pass lint, typecheck, unit tests và production bundle.
- [ ] Manual regression test trực tiếp trong Obsidian desktop/mobile.
