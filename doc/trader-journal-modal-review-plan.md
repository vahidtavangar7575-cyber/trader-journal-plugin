# Kế hoạch sửa lỗi Trader Journal Modal

## 1. Thông tin tài liệu

| Thuộc tính | Giá trị |
| --- | --- |
| Phạm vi chính | `src/ui/TraderJournalModal.tsx`, `src/ui/traderJournal/` |
| Phạm vi liên quan | `src/trades/storage.ts`, `src/plans/storage.ts`, test và CSS của modal |
| Ngày review | 2026-08-20 |
| Mục tiêu | Ngăn hỏng dữ liệu, tránh trade trùng, đảm bảo liên kết plan và attachment nhất quán |
| Ngoài phạm vi | Thay đổi schema trade, plugin ID, command ID hoặc thêm dịch vụ mạng |

## 2. Tóm tắt

Review phát hiện bảy vấn đề chính:

1. Tags bị biến đổi sai khi chỉnh sửa backtest trade.
2. Retry sau lỗi ghi một phần có thể tạo trade trùng.
3. Thay đổi symbol hoặc ngày mở khi edit làm trade nằm sai daily note.
4. Giá có precision lớn hơn hai chữ số thập phân bị native form validation chặn.
5. Plan không hợp lệ có thể được giữ lại sau khi symbol hoặc ngày mở thay đổi.
6. Paste nhiều ảnh có thể để lại attachment rác nếu chỉ một phần thao tác thành công.
7. Đóng modal trong lúc paste hoặc save có thể làm rò rỉ hoặc xóa nhầm attachment.

Thứ tự ưu tiên triển khai:

1. Bảo vệ tính toàn vẹn dữ liệu: tags, ID ổn định và xử lý save một phần.
2. Khóa identity của trade khi edit.
3. Sửa validation giá và tính hợp lệ của plan.
4. Làm an toàn vòng đời attachment.
5. Tách file và bổ sung test cho logic thuần.

## 3. Vấn đề và hướng giải quyết

### 3.1. Tags bị hỏng khi chỉnh sửa backtest trade

#### Hiện trạng

`createInitialForm()` dùng `stringifyValue(initialTrade?.tags)`. Khi `tags` là mảng, giá trị trong input trở thành chuỗi JSON như `['breakout', 'trend']` ở dạng `"[\"breakout\",\"trend\"]"`.

Khi lưu, `parseTags()` chỉ tách chuỗi theo dấu phẩy. Kết quả chứa dấu ngoặc và dấu nháy, làm thay đổi dữ liệu dù người dùng không chỉnh sửa tags.

#### Tác động

- Tags của backtest trade bị sai sau một lần edit/save.
- `tradeTags` trong daily note và bộ lọc dựa trên tags nhận giá trị sai.
- Đây là lỗi biến đổi dữ liệu đã tồn tại.

#### Các bước xử lý

1. Dùng `formatTags(initialTrade?.tags)` để chuẩn hóa cả mảng và chuỗi legacy.
2. Ghép kết quả bằng `join(', ')` trước khi đưa vào input.
3. Giữ `parseTags()` làm chiều chuyển đổi từ input về mảng.
4. Bổ sung test round-trip cho:
   - mảng tags;
   - chuỗi tags phân tách bằng dấu phẩy;
   - tags có tiền tố `#`;
   - tags rỗng và tags trùng nhau.
5. Cân nhắc loại bỏ tags trùng trong `parseTags()` để dữ liệu lưu ổn định.

#### Tiêu chí nghiệm thu

- Mở rồi lưu một trade có `['breakout', 'trend']` vẫn thu được đúng hai tags đó.
- Input hiển thị `breakout, trend`, không hiển thị JSON.
- Không còn dấu ngoặc hoặc dấu nháy thừa trong thống kê tags.

### 3.2. Retry sau lỗi có thể tạo trade trùng

#### Hiện trạng

ID được tạo bên trong mỗi lần `saveTrade()` chạy. Với trade mới, một lần retry tạo ID khác lần trước.

Luồng save gồm nhiều thao tác nối tiếp:

```text
Ghi trade vào daily note
        │
        ▼
Rebuild metadata/thống kê
        │
        ▼
Đồng bộ liên kết plan
```

Nếu bước đầu đã ghi file nhưng bước sau thất bại, modal vẫn hiển thị lỗi chung. Người dùng retry sẽ append một trade mới thay vì hoàn thành phần còn thiếu.

#### Tác động

- Một thao tác của người dùng có thể tạo nhiều trade.
- Plan và journal có thể ở trạng thái không nhất quán.
- Nếu người dùng đóng modal sau lỗi đồng bộ plan, attachment của trade đã ghi có thể bị cleanup như dữ liệu chưa lưu.

#### Các bước xử lý

1. Tạo trade ID một lần khi khởi tạo form hoặc lưu trong `useRef`.
2. Mọi lần retry phải dùng cùng ID.
3. Trong storage, thêm thao tác upsert theo trade ID hoặc kiểm tra ID trước khi append.
4. Phân biệt trạng thái:
   - chưa ghi trade;
   - trade đã ghi nhưng rebuild thất bại;
   - trade đã ghi nhưng đồng bộ plan thất bại;
   - hoàn tất toàn bộ.
5. Sau khi trade đã được ghi, không cleanup attachment chỉ vì bước đồng bộ plan thất bại.
6. Hiển thị thông báo đúng trạng thái, ví dụ trade đã lưu nhưng chưa đồng bộ được plan.
7. Bổ sung fault-injection test cho lỗi ở từng bước.

#### Tiêu chí nghiệm thu

- Retry bao nhiêu lần cũng chỉ có một trade block với cùng ID.
- Lỗi đồng bộ plan không làm người dùng hiểu nhầm rằng trade chưa được ghi.
- Attachment của trade đã ghi không bị xóa khi đóng modal sau lỗi hậu xử lý.

### 3.3. Symbol và ngày mở thay đổi khi edit

#### Quyết định

Khóa hai trường **Symbol** và **Opened at** khi chỉnh sửa trade.

Không triển khai di chuyển trade giữa daily note trong phạm vi sửa hiện tại. Việc di chuyển cần xử lý đồng thời file nguồn, file đích, thống kê, frontmatter và liên kết plan nên có rủi ro cao hơn đáng kể.

#### Hiện trạng

Khi edit, modal luôn gọi `updateTradeInJournalFile()` với `targetFilePath` cũ. Nếu symbol hoặc ngày trong `openedAt` thay đổi, trade vẫn nằm trong daily note cũ.

#### Tác động

- Trade của symbol mới có thể nằm trong thư mục/note của symbol cũ.
- Ngày trên dashboard tiếp tục lấy theo journal note cũ.
- Summary và frontmatter không còn biểu diễn đúng tất cả trade trong note.

#### Các bước xử lý

1. Xác định edit mode bằng `initialTrade && targetFilePath` như hiện tại.
2. Đặt `disabled={isEditing}` cho select **Symbol**.
3. Đặt `disabled={isEditing}` cho input **Opened at**.
4. Giữ hai trường hoạt động bình thường khi tạo trade mới.
5. Xác nhận giá trị từ `initialTrade` vẫn được giữ nguyên trong state và payload save.
6. Thêm test UI hoặc component test xác nhận trạng thái enabled/disabled theo mode.
7. Nếu sau này cần sửa identity, tạo command riêng **Move trade** với transaction rõ ràng thay vì mở khóa trực tiếp hai trường.

#### Trạng thái

Đã áp dụng bước 2 và bước 3 trong `TradeIdentityFields.tsx` và `TradeExecutionFields.tsx`.

#### Tiêu chí nghiệm thu

- Tạo trade mới: Symbol và Opened at vẫn chỉnh sửa được.
- Edit trade: Symbol và Opened at hiển thị giá trị hiện tại nhưng không chỉnh sửa được.
- Save edit không thay đổi journal identity hoặc đường dẫn daily note.

### 3.4. Precision của các trường giá bị giới hạn

#### Hiện trạng

Entry price, stop loss, exit price và take profit dùng `step="0.01"`. Trình duyệt đánh dấu các giá như `1.08425` là `stepMismatch` và chặn submit trước khi handler React chạy.

#### Tác động

- Không thể nhập chính xác nhiều cặp Forex, crypto hoặc instrument có tick size nhỏ.
- UI có thể không hiển thị lỗi tùy chỉnh vì native validation chặn trước.

#### Các bước xử lý

1. Đổi bốn input giá sang `step="any"`.
2. Tiếp tục dùng `parseRequiredNumber()` để kiểm tra giá trị hữu hạn.
3. Xác định có cho phép giá bằng không hoặc giá âm hay không; nếu không, thêm validation domain thay vì dựa riêng vào thuộc tính HTML.
4. Bổ sung test cho giá hai, bốn, năm và tám chữ số thập phân.
5. Kiểm tra thủ công trên desktop và mobile.

#### Tiêu chí nghiệm thu

- Các giá `100.25`, `1.08425` và `0.00001234` đều submit được.
- Giá rỗng, `NaN` hoặc vô hạn vẫn bị từ chối.
- Quy tắc stop loss/take profit theo long/short vẫn hoạt động.

### 3.5. Plan không còn phù hợp vẫn được giữ lại

#### Hiện trạng

Khi symbol thay đổi, `planId` chỉ bị xóa nếu setup đang chọn không dùng được cho symbol mới. Nếu setup dùng chung, plan của symbol cũ vẫn còn.

`listTradePlanOptions()` còn nhận `includePlanId`, vì vậy plan đang chọn tiếp tục xuất hiện kể cả khi không còn khớp symbol hoặc ngày mở.

#### Tác động

- Live trade có thể liên kết tới plan của symbol khác.
- Trade có thể dùng plan ngoài khoảng ngày hiệu lực.
- Thống kê planned/unplanned và linked trades không phản ánh đúng nghiệp vụ.

#### Các bước xử lý

1. Với create mode, khi symbol thay đổi, xóa `planId` nếu plan không khớp symbol mới.
2. Khi ngày mở thay đổi, xóa `planId` nếu plan không active tại ngày mới.
3. Chỉ dùng `includePlanId` để giữ liên kết lịch sử trong edit mode.
4. Thêm validation trước save để từ chối plan khác symbol.
5. Thêm validation khoảng ngày, đồng thời xác định rõ chính sách với plan đã đóng nhưng trade lịch sử vẫn hợp lệ.
6. Bổ sung test cho plan dùng setup chung giữa nhiều symbol.

#### Lưu ý sau quyết định khóa identity

Trong edit mode, symbol và ngày mở đã bị khóa nên lỗi này chủ yếu còn áp dụng cho luồng tạo trade mới.

#### Tiêu chí nghiệm thu

- Create mode không thể lưu trade ETH với plan BTC.
- Đổi ngày ra ngoài khoảng hiệu lực sẽ bỏ chọn plan hoặc hiển thị lỗi rõ ràng.
- Edit trade lịch sử vẫn hiển thị plan đã đóng nếu plan đó là liên kết hiện tại.

### 3.6. Paste nhiều ảnh có thể để lại attachment rác

#### Hiện trạng

Các ảnh được lưu đồng thời bằng `Promise.all()`. Nếu một promise reject, kết quả của các ảnh đã thành công không được trả về để thêm vào `createdAttachmentPathsRef`.

#### Tác động

- Vault có file ảnh không được trade nào tham chiếu.
- Người dùng không biết file rác đã được tạo.
- Các promise còn chạy có thể tiếp tục tạo file sau khi UI đã chuyển sang trạng thái lỗi.

#### Các bước xử lý

1. Tạo helper quản lý một batch paste với danh sách path đã tạo.
2. Ghi nhận path ngay sau từng lần `createBinary()` thành công.
3. Dùng `Promise.allSettled()` để chờ toàn bộ batch kết thúc.
4. Nếu bất kỳ ảnh nào thất bại, rollback tất cả ảnh thành công trong batch hoặc giữ ảnh thành công và thông báo partial success; chọn một chính sách duy nhất.
5. Ưu tiên rollback toàn batch để thao tác có tính nguyên tử đối với người dùng.
6. Chỉ cập nhật form sau khi batch đạt trạng thái thành công.
7. Test tình huống ảnh thứ nhất/thứ hai/thứ ba lần lượt thất bại.

#### Tiêu chí nghiệm thu

- Batch thất bại không để lại attachment rác.
- Batch thành công thêm đúng số ảnh và không tạo bản ghi trùng.
- Thông báo lỗi không che mất thông tin về rollback thất bại, nếu có.

### 3.7. Đóng modal trong lúc thao tác async

#### Hiện trạng

Nút Cancel bị disable khi paste/save nhưng modal vẫn có thể bị đóng bởi Escape, click ngoài modal, unload plugin hoặc thao tác từ code khác.

Cleanup hiện chạy ngay khi component unmount:

- Nếu paste chưa xong, file có thể được tạo sau cleanup và trở thành file rác.
- Nếu save đang chạy, cleanup có thể xóa attachment trước khi `savedTradeRef` chuyển sang `true`.

#### Tác động

- Trade đã lưu có thể tham chiếu tới ảnh bị xóa.
- Vault có attachment không được theo dõi.
- Async callback tiếp tục chạy sau khi component đã unmount.

#### Các bước xử lý

1. Theo dõi mounted state và batch/in-flight operation bằng ref.
2. Tách trạng thái attachment thành:
   - temporary;
   - committing;
   - committed;
   - cleanup pending.
3. Khi save bắt đầu commit, không xóa attachment chỉ dựa trên việc component unmount.
4. Nếu component unmount trong lúc paste, đánh dấu batch phải cleanup ngay sau khi promise hoàn tất.
5. Ngăn cập nhật React state sau unmount.
6. Cân nhắc chặn hành vi Escape/click ngoài modal khi commit đang chạy, nhưng vẫn phải có cleanup an toàn vì plugin unload không thể bị chặn.
7. Test bằng deferred promise để điều khiển chính xác thứ tự close, createBinary và save.

#### Tiêu chí nghiệm thu

- Đóng modal ở mọi thời điểm không tạo file rác.
- Attachment đã commit không bị cleanup.
- Attachment chưa commit luôn được trash sau khi các thao tác đang chạy kết thúc.

## 4. Kế hoạch triển khai theo giai đoạn

### Giai đoạn 1: sửa lỗi dữ liệu

1. Sửa round-trip tags.
2. Tạo ID ổn định cho trade mới.
3. Làm save idempotent theo trade ID.
4. Phân loại lỗi trước và sau khi trade đã được ghi.
5. Thêm unit test cho tags và retry.

### Giai đoạn 2: bảo vệ journal identity và plan

1. Khóa Symbol và Opened at trong edit mode.
2. Làm mới/xóa plan khi symbol hoặc ngày thay đổi trong create mode.
3. Thêm validation plan trước save.
4. Thêm test create/edit mode và tính hợp lệ của plan.

### Giai đoạn 3: giá và attachment

1. Cho phép precision linh hoạt ở các input giá.
2. Chuyển batch paste sang cơ chế theo dõi từng kết quả.
3. Làm cleanup an toàn khi unmount và khi save một phần.
4. Thêm test async failure/unmount.

### Giai đoạn 4: tái cấu trúc

Cấu trúc đã được chuyển sang cùng mô hình facade → component → hooks như `tradeCalendar`:

```text
src/ui/
  TraderJournalModal.tsx       # Obsidian Modal facade và React lifecycle

src/ui/traderJournal/
  TraderJournalForm.tsx        # Form orchestration
  TemporaryAttachmentRegistry.ts
  dateTime.ts
  form.ts
  images.tsx
  planLink.ts
  components/
    TradeIdentityFields.tsx
    TradeExecutionFields.tsx
    TradeSetupFields.tsx
    TradeImageFields.tsx
    TradeFormActions.tsx
  hooks/
    useTradeReferenceData.ts
    useTradeAttachments.ts
    useTradeSave.ts

src/trades/
  tradeBlocks.ts

src/plans/
  linkedTrades.ts
```

`TraderJournalModal.tsx` chỉ còn quản lý vòng đời Obsidian modal và React root. `TraderJournalForm.tsx` ghép các component và hooks, không trực tiếp chứa nghiệp vụ attachment hoặc save. Các nhóm trường UI có trách nhiệm riêng, trong khi validation, khởi tạo form, date-time, image storage/preview, plan link và thao tác trade block nằm trong module chuyên biệt.

## 5. Ma trận kiểm thử tối thiểu

| Nhóm | Trường hợp cần kiểm tra |
| --- | --- |
| Tags | array, legacy string, `#tag`, empty, duplicate, round-trip |
| Identity | create enabled, edit disabled, payload giữ nguyên symbol/opened_at |
| Save | lỗi trước write, lỗi sau write, lỗi sync plan, retry nhiều lần |
| Plan | khác symbol, ngoài ngày hiệu lực, plan đã đóng lịch sử, không chọn plan |
| Price | 2/4/5/8 chữ số thập phân, rỗng, long/short invalidation |
| Images | một ảnh, nhiều ảnh, partial failure, remove, cancel, unmount khi paste |
| Lifecycle | close khi save, plugin unload, callback hoàn thành sau unmount |

## 6. Trạng thái triển khai

| Vấn đề | Trạng thái | Thay đổi chính |
| --- | --- | --- |
| Tags bị hỏng khi edit | Đã sửa | Chuẩn hóa input bằng `formatTags()` và parse về mảng không trùng |
| Retry tạo trade trùng | Đã sửa | Giữ ID ổn định, upsert block theo ID và phân biệt lỗi hậu xử lý |
| Symbol/ngày mở làm sai daily note | Đã sửa | Khóa **Symbol** và **Opened at** trong edit mode |
| Precision giá bị giới hạn | Đã sửa | Bốn input giá dùng `step="any"` và vẫn được validate bằng số hữu hạn |
| Plan không phù hợp | Đã sửa | Bỏ plan khi identity đổi, validate symbol/ngày và chỉ include plan lịch sử khi edit |
| Partial paste để lại file rác | Đã sửa | Chờ toàn bộ kết quả, rollback các file thành công khi batch có lỗi |
| Đóng modal khi async | Đã sửa | Registry quản lý trạng thái temporary/committing/committed và cleanup trễ |
| Linked trade label bị cũ | Đã sửa bổ sung | Upsert reference trong plan thay vì bỏ qua trade đã liên kết |
| Modal quá lớn, trộn lifecycle/UI/nghiệp vụ | Đã sửa | Tách facade, form, field components và hooks theo cấu trúc `tradeCalendar` |

Test hồi quy được bổ sung cho tags, plan compatibility, price precision, stable trade-block replacement, linked-trade upsert, date synchronization và attachment lifecycle.

## 7. Definition of done

Một giai đoạn chỉ hoàn tất khi:

1. TypeScript strict check đạt.
2. ESLint đạt.
3. Toàn bộ test hiện tại đạt.
4. Test hồi quy mới cho vấn đề tương ứng đạt.
5. Không tạo network request hoặc dependency mới.
6. Kiểm tra thủ công modal trên Obsidian desktop.
7. Với thay đổi input/lifecycle, kiểm tra thêm trên mobile nếu có môi trường phù hợp.
