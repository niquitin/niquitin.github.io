/**
 * Nguồn dữ liệu tập trung của NiQuitin Hub.
 *
 * Hướng dẫn thêm dự án mới về sau:
 * 1. Thêm nhóm danh mục mới vào mảng `categories` (nếu cần).
 * 2. Thêm một đối tượng dự án vào mảng `projects` theo đúng mẫu của MeloVault / Vua Bàn Nhậu.
 * 3. Đặt icon + ảnh chụp màn hình WebP vào thư mục `assets/<project-id>/`.
 * 4. Chính sách bắt buộc: KHÔNG đặt đường dẫn tải file cài đặt Android trực tiếp (.a-p-k)
 *    hoặc link phát hành nội bộ của MeloVault trong tệp công khai này.
 */
window.NIQUITIN_HUB_DATA = {
  brand: {
    name: 'NiQuitin Hub',
    author: 'Nguyễn Dũng',
    tagline: 'Kho ứng dụng & dự án số thực tế'
  },
  categories: [
    { id: 'all', label: 'Tất cả ứng dụng' },
    { id: 'media', label: 'Nghe nhìn & Tiện ích' },
    { id: 'party', label: 'Trò chơi & Tiệc tùng' }
  ],
  projects: [
    {
      id: 'melovault',
      category: 'media',
      categoryLabel: 'Nghe nhìn & Tiện ích',
      accent: 'teal',
      name: 'MeloVault',
      url: 'https://melovault.pages.dev/',
      subtitle: 'Nhạc & video đa nguồn cho Điện thoại và Máy tính bảng Android',
      statusBadge: 'Google Play Alpha',
      platformBadge: 'Android 8.0+',
      fallbackVersion: 'v0.6.145',
      fallbackUpdated: '26/11/2026',
      liveVersionEndpoint: 'https://melovault.pages.dev/update.json',
      liveVersionType: 'melovault',
      icon: 'assets/melovault/icon.svg',
      summary:
        'Gom nhạc Lossless và video từ Telegram, Bộ sưu tập TikTok, Video Facebook cùng nhạc trên máy về một thư viện duy nhất — gạt Nhạc/Video liền mạch kiểu YouTube Music, tự đồng bộ giữa điện thoại và tablet.',
      highlights: [
        'Gạt Nhạc / Video tức thì',
        'Telegram · TikTok · Facebook · Offline',
        'Đồng bộ Điện thoại & Tablet',
        '3 giao diện: Liquid Glass · Hoàng hôn · Tối giản'
      ],
      keywords:
        'melovault nhac video lossless flac wav mp3 telegram tiktok facebook eq loi nhac android tablet hai khung hoang hon liquid glass',
      screens: {
        phone: [
          {
            src: 'assets/melovault/phone-library.webp',
            width: 600,
            height: 1283,
            caption: 'Thư viện đa nguồn · Giao diện Liquid Glass',
            alt: 'Thư viện nhạc Lossless của MeloVault trên điện thoại ở giao diện Liquid Glass: tìm kiếm nhanh, lọc nguồn Telegram, Trên máy, TikTok và thanh phát kính mờ ở đáy'
          },
          {
            src: 'assets/melovault/phone-player.webp',
            width: 600,
            height: 1283,
            caption: 'Đang phát · Thanh gạt Nhạc / Video',
            alt: 'Màn hình Đang phát của MeloVault trên điện thoại ở giao diện Hoàng hôn: thanh gạt Nhạc và Video kiểu YouTube Music, ảnh bìa lớn, Lời nhạc, EQ và Hẹn giờ'
          }
        ],
        tablet: [
          {
            src: 'assets/melovault/tablet-split.webp',
            width: 1100,
            height: 596,
            caption: 'Bố cục Hai khung trên Máy tính bảng xoay ngang',
            alt: 'Giao diện Hai khung trên máy tính bảng xoay ngang của MeloVault với khung Đang phát ở cột trái và danh sách nhạc Lossless FLAC ở cột phải'
          }
        ]
      },
      actions: [
        {
          label: 'Khám phá trang MeloVault',
          url: 'https://melovault.pages.dev/',
          variant: 'primary'
        },
        {
          label: 'Bước 1: Vào nhóm Tester',
          url: 'https://groups.google.com/g/melovault-testers',
          variant: 'secondary'
        },
        {
          label: 'Bước 2: Cài trên Google Play',
          url: 'https://play.google.com/apps/testing/app.melovault.player.open',
          variant: 'secondary'
        },
        {
          label: 'Nhóm hỗ trợ Telegram',
          url: 'https://t.me/melovaultmusicplayer',
          variant: 'ghost'
        }
      ],
      disclaimer:
        'Ứng dụng đang thử nghiệm kín trên Google Play (cần dùng chung 1 tài khoản Gmail cho Bước 1 & Bước 2). MeloVault là ứng dụng không chính thức, dùng Telegram API; không liên kết với Telegram, TikTok hay Facebook.'
    },
    {
      id: 'vuabannhau',
      category: 'party',
      categoryLabel: 'Trò chơi & Tiệc tùng',
      accent: 'party',
      name: 'Vua Bàn Nhậu',
      url: 'https://vuabannhau.pages.dev/',
      subtitle: 'Party King Edition — Bộ 10 mini-game khuấy động bàn tiệc trên 1 thiết bị',
      statusBadge: 'Bản chính thức',
      platformBadge: 'Web/PWA · Android 7.0+ · 18+',
      fallbackVersion: 'v5.20.3',
      fallbackUpdated: '26/11/2026',
      liveVersionEndpoint: 'https://vuabannhau.pages.dev/android-latest.json',
      liveVersionType: 'vuabannhau',
      icon: 'assets/vuabannhau/icon.svg',
      summary:
        'Mở lên là chơi ngay cùng hội bạn tại bàn tiệc, sinh nhật hay chuyến đi xa: Vòng quay may mắn, Khám răng cá sấu, Đâm hải tặc, Bom hẹn giờ, Xúc xắc... Thao tác gọn một tay, chọn linh hoạt chế độ Bia hoặc Không cồn, chơi mượt cả khi tắt mạng.',
      highlights: [
        '10 mini-game tiệc tùng sôi động',
        'Chơi ngay trên Web không cần cài',
        'Bản Android chơi offline 100%',
        'Chế độ Bia / Không cồn vui văn minh'
      ],
      keywords:
        'vua ban nhau party king game tiec tung vong quay may man ca sau hai tac bom hen gio xuc xac pwa web android offline 18+',
      screens: {
        phone: [
          {
            src: 'assets/vuabannhau/phone-home.webp',
            width: 600,
            height: 1067,
            caption: 'Sảnh 10 mini-game tiệc tùng',
            alt: 'Màn hình chính Vua Bàn Nhậu trên điện thoại hiển thị các trò chơi tiệc tùng nổi bật như Vòng quay, Xoay chai, Khám răng cá sấu và Bom hẹn giờ'
          },
          {
            src: 'assets/vuabannhau/phone-wheel.webp',
            width: 600,
            height: 1067,
            caption: 'Vòng quay bàn tiệc trực quan',
            alt: 'Màn hình Vòng quay may mắn của Vua Bàn Nhậu trên điện thoại với bảng chia ô sắc nét và nút quay lớn dễ bấm bằng một tay'
          }
        ],
        tablet: [
          {
            src: 'assets/vuabannhau/tablet-home.webp',
            width: 1100,
            height: 619,
            caption: 'Giao diện sảnh rộng trên Máy tính bảng',
            alt: 'Giao diện sảnh chính Vua Bàn Nhậu trên máy tính bảng xoay ngang hiển thị đầy đủ bộ mini-game đặt giữa bàn tiệc'
          }
        ]
      },
      actions: [
        {
          label: 'Chơi ngay trên Web',
          url: 'https://vuabannhau.pages.dev/',
          variant: 'primary'
        },
        {
          label: 'Trang cài cho Android',
          url: 'https://vuabannhau.pages.dev/android.html',
          variant: 'secondary'
        }
      ],
      disclaimer:
        'Chỉ dành cho người từ 18 tuổi trở lên. Không ép uống; hỗ trợ đầy đủ chế độ đồ uống không cồn để mọi người cùng vui lành mạnh.'
    }
  ]
};
