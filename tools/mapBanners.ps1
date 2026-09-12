# Draws the map-name lettering with GDI+, which gets Uniscribe shaping for
# Thai and the CJK faces for free. Reads a jobs JSON, writes raw BGRA so node
# can composite it straight onto the ornament without a PNG decoder.
param([string]$JobsPath)

Add-Type -AssemblyName System.Drawing

$jobs = Get-Content -LiteralPath $JobsPath -Raw -Encoding UTF8 | ConvertFrom-Json

foreach ($job in $jobs) {
  $w = [int]$job.width
  $h = [int]$job.height
  $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

  $family = New-Object System.Drawing.FontFamily($job.font)
  $style = [System.Drawing.FontStyle]$job.style

  # GetBounds measures the glyph outlines only. What actually lands on the
  # plate is wider: half the rim on each side, and the shadow past the bottom
  # right. Fit the inked box, not the path, or a long name touches the plate
  # edge and a tall one runs into the flourish below.
  $stroke = [float]$job.stroke
  $shadowBy = 1.5
  $padX = ($stroke / 2) + $shadowBy + 1
  $padY = ($stroke / 2) + $shadowBy + 1

  $size = [float]$job.size
  $maxW = $w - (2 * $padX)
  $maxH = $h - (2 * $padY)
  $path = $null
  while ($size -gt 6) {
    $try = New-Object System.Drawing.Drawing2D.GraphicsPath
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $try.AddString($job.text, $family, [int]$style, $size, (New-Object System.Drawing.PointF(($w / 2), 0)), $fmt)
    $b = $try.GetBounds()
    if ($b.Width -le $maxW -and $b.Height -le $maxH) { $path = $try; break }
    $try.Dispose()
    $size = $size - 0.5
  }
  if ($null -eq $path) { Write-Error "no fit: $($job.text)"; continue }

  # Centre what was actually drawn, then lift it by the shadow so the ink sits
  # centred rather than the outlines.
  $b = $path.GetBounds()
  $shift = New-Object System.Drawing.Drawing2D.Matrix
  $shift.Translate(
    ($w / 2) - ($b.X + $b.Width / 2) - ($shadowBy / 2),
    (($h - $b.Height) / 2) - $b.Y - ($shadowBy / 2))
  $path.Transform($shift)
  $b = $path.GetBounds()

  # The original is a silver bevel: bright top, grey waist, bright again. The
  # battle-zone strip is the one plate lettered in rose instead.
  $rect = New-Object System.Drawing.RectangleF($b.X, $b.Y, [Math]::Max($b.Width, 1), [Math]::Max($b.Height, 1))
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::White,
    [System.Drawing.Color]::Gray,
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend(4)
  if ($job.palette -eq 'rose') {
    $blend.Colors = @(
      [System.Drawing.Color]::FromArgb(255, 252, 226, 228),
      [System.Drawing.Color]::FromArgb(255, 244, 186, 192),
      [System.Drawing.Color]::FromArgb(255, 196, 104, 116),
      [System.Drawing.Color]::FromArgb(255, 232, 160, 170))
  } else {
    $blend.Colors = @(
      [System.Drawing.Color]::FromArgb(255, 253, 253, 252),
      [System.Drawing.Color]::FromArgb(255, 248, 247, 243),
      [System.Drawing.Color]::FromArgb(255, 150, 148, 142),
      [System.Drawing.Color]::FromArgb(255, 226, 224, 216))
  }
  $blend.Positions = @(0.0, 0.42, 0.72, 1.0)
  $brush.InterpolationColors = $blend

  # Drop shadow first, then the black rim, then the fill.
  $shadow = New-Object System.Drawing.Drawing2D.Matrix
  $shadow.Translate(1.5, 1.5)
  $ghost = $path.Clone()
  $ghost.Transform($shadow)
  $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 0, 0, 0))
  $g.FillPath($shadowBrush, $ghost)

  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0, 0, 0), [float]$job.stroke)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($pen, $path)
  $g.FillPath($brush, $path)

  # Raw BGRA, top-down, for node.
  $data = $bmp.LockBits(
    (New-Object System.Drawing.Rectangle(0, 0, $w, $h)),
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($data.Stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  [System.IO.File]::WriteAllBytes($job.out, $bytes)

  $g.Dispose(); $bmp.Dispose(); $path.Dispose(); $ghost.Dispose()
  Write-Output "$($job.out) $($job.text) @ $size"
}
