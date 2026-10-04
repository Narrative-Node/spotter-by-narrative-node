<#
  Spotter by Narrative Node: draws the Windows installer's pictures from brand/logo.png and the brand's
  fonts (brand/fonts), in the store banner's colours: a deep teal field, the mark in light ink, and a
  waveform played up to its middle, as the panel's player shows it.
  Copyright (C) 2026 Narrative Node. GPL-3.0-or-later; see LICENSE.

    powershell -ExecutionPolicy Bypass -File installer\windows\art\make-art.ps1

  Writes, all committed so a build needs no drawing:
    side-<dpi>.bmp   the welcome and finish page banner, one per display scale
    head-<dpi>.png   the header mark
    spotter.ico      the installer's icon
#>
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;

public static class Mark {
  // The logo is a dark teal N with a pale teal offset, on white. Recolour both inks and drop the white,
  // so the mark sits on any field; then crop to the N, so sizes are the mark's own.
  public static Bitmap Recolor(Bitmap src, Color main, Color accent) {
    int w = src.Width, h = src.Height;
    var s = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(s)) g.DrawImage(src, 0, 0, w, h);
    var d = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    var rs = s.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var rd = d.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    var a = new byte[rs.Stride * h];
    var b = new byte[rd.Stride * h];
    System.Runtime.InteropServices.Marshal.Copy(rs.Scan0, a, 0, a.Length);
    int x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int i = y * rs.Stride + x * 4;
        int r = a[i + 2], alpha = a[i + 3];
        double cover, t;
        if (r <= 169) { t = Math.Min(1.0, Math.Max(0.0, (r - 31) / 138.0)); cover = 1.0; }
        else { t = 1.0; cover = Math.Max(0.0, (255 - r) / 86.0); }
        cover = cover * alpha / 255.0;
        if (cover < 0.004) continue;
        int o = y * rd.Stride + x * 4;
        b[o + 0] = (byte)(main.B + (accent.B - main.B) * t);
        b[o + 1] = (byte)(main.G + (accent.G - main.G) * t);
        b[o + 2] = (byte)(main.R + (accent.R - main.R) * t);
        b[o + 3] = (byte)(255 * cover);
        if (cover > 0.5) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    System.Runtime.InteropServices.Marshal.Copy(b, 0, rd.Scan0, b.Length);
    s.UnlockBits(rs); d.UnlockBits(rd); s.Dispose();
    var crop = d.Clone(new Rectangle(x0, y0, x1 - x0 + 1, y1 - y0 + 1), PixelFormat.Format32bppArgb);
    d.Dispose();
    return crop;
  }
}
"@

$here = $PSScriptRoot
$root = Resolve-Path (Join-Path $here "..\..\..")
$logoSrc = New-Object Drawing.Bitmap (Join-Path $root "brand\logo.png")

function Hex($h) { [Drawing.ColorTranslator]::FromHtml($h) }
$field = Hex "#0F2A2E"; $deep = Hex "#081618"; $glow = Hex "#1F585E"
$bright = Hex "#F0F7FA"; $mid = Hex "#3F8A92"; $dim = Hex "#7FA5A9"; $played = Hex "#6FB4BB"; $ahead = Hex "#2E5257"

$fonts = New-Object Drawing.Text.PrivateFontCollection
$fonts.AddFontFile((Join-Path $root "brand\fonts\Inter-Medium.ttf"))
$fonts.AddFontFile((Join-Path $root "brand\fonts\Inter-Regular.ttf"))
$inter = $fonts.Families | Where-Object { $_.Name -like "Inter*" } | Select-Object -First 1
if (-not $inter) { throw "Inter did not load" }
function Face($px) { New-Object Drawing.Font $inter, ([single]$px), ([Drawing.FontStyle]::Regular), ([Drawing.GraphicsUnit]::Pixel) }

$lightMark = [Mark]::Recolor($logoSrc, $bright, $mid)

function New-Canvas($w, $h) {
  $bmp = New-Object Drawing.Bitmap $w, $h, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.TextRenderingHint = 'AntiAliasGridFit'; $g.PixelOffsetMode = 'HighQuality'
  return @($bmp, $g)
}

function Save-Scaled($big, $w, $h, $path, $format, $opaque) {
  $pf = if ($opaque) { [Drawing.Imaging.PixelFormat]::Format24bppRgb } else { [Drawing.Imaging.PixelFormat]::Format32bppArgb }
  $out = New-Object Drawing.Bitmap $w, $h, $pf
  $o = [Drawing.Graphics]::FromImage($out)
  $o.InterpolationMode = 'HighQualityBicubic'; $o.PixelOffsetMode = 'HighQuality'; $o.SmoothingMode = 'HighQuality'
  $o.DrawImage($big, 0, 0, $w, $h)
  $out.Save($path, $format); $o.Dispose(); $out.Dispose(); $big.Dispose()
}

function Text($g, $s, $face, $color, $x, $y) {
  $g.DrawString($s, $face, (New-Object Drawing.SolidBrush $color), ([single]$x), ([single]$y), ([Drawing.StringFormat]::GenericTypographic))
}

# The banner: mark and name at the top; along the foot, a waveform played to its middle in pale teal.
function Draw-Side($tw, $th, $path) {
  $S = 4; $w = $tw * $S; $h = $th * $S
  $bmp, $g = New-Canvas $w $h
  $k = $w / 164.0; $H = $h / $k
  $g.Clear($deep)
  $brush = New-Object Drawing.Drawing2D.LinearGradientBrush ((New-Object Drawing.Rectangle 0, 0, $w, $h)), $field, $deep, 90.0
  $g.FillRectangle($brush, 0, 0, $w, $h)
  $path2 = New-Object Drawing.Drawing2D.GraphicsPath
  $path2.AddEllipse([single](-60 * $k), [single](-70 * $k), [single](230 * $k), [single](230 * $k))
  $pg = New-Object Drawing.Drawing2D.PathGradientBrush $path2
  $pg.CenterColor = [Drawing.Color]::FromArgb(110, $glow); $pg.SurroundColors = @([Drawing.Color]::FromArgb(0, $glow))
  $g.FillRectangle($pg, 0, 0, $w, [int](190 * $k))

  $mh = 40 * $k; $mw = $mh * $lightMark.Width / $lightMark.Height
  $g.DrawImage($lightMark, [single](22 * $k), [single](30 * $k), [single]$mw, [single]$mh)
  Text $g "Spotter" (Face (25 * $k)) $bright (21 * $k) (82 * $k)
  Text $g "by Narrative Node" (Face (11.5 * $k)) $dim (22.5 * $k) (113 * $k)

  # A fixed, hand-shaped envelope: a swell, a hit, a tail. Drawn, not taken from any file.
  $env = @(0.18,0.22,0.3,0.36,0.44,0.5,0.58,0.62,0.7,0.74,0.8,0.86,0.9,0.95,1.0,0.92,0.84,0.72,0.66,0.6,0.52,0.48,0.56,0.64,0.7,0.62,0.5,0.42,0.36,0.3,0.26,0.22,0.2,0.17,0.15,0.13,0.11,0.1,0.09,0.08)
  $bar = 2.0; $gap = 1.0; $x0 = 22; $mid = $H - 46; $amp = 26
  for ($i = 0; $i -lt $env.Count; $i++) {
    $bh = [Math]::Max(1.5, $env[$i] * $amp)
    $color = $(if ($i -lt 19) { $played } else { $ahead })
    $g.FillRectangle((New-Object Drawing.SolidBrush $color), [single](($x0 + $i * ($bar + $gap)) * $k), [single](($mid - $bh / 2) * $k), [single]($bar * $k), [single]($bh * $k))
  }
  $g.Dispose(); Save-Scaled $bmp $tw $th $path ([Drawing.Imaging.ImageFormat]::Bmp) $true
}

function Draw-Head($tw, $th, $path) {
  $S = 4; $w = $tw * $S; $h = $th * $S
  $bmp, $g = New-Canvas $w $h
  $mh = [Math]::Min($w, $h) * 0.62; $mw = $mh * $lightMark.Width / $lightMark.Height
  $g.DrawImage($lightMark, [single](($w - $mw) / 2), [single](($h - $mh) / 2), [single]$mw, [single]$mh)
  $g.Dispose(); Save-Scaled $bmp $tw $th $path ([Drawing.Imaging.ImageFormat]::Png) $false
}

# The icon: the mark in light ink on a rounded deep-teal tile, 256 px, saved as a PNG-in-ICO.
function Draw-Icon($path) {
  $bmp, $g = New-Canvas 256 256
  $tile = New-Object Drawing.Drawing2D.GraphicsPath; $r = 48
  $tile.AddArc(0, 0, $r, $r, 180, 90); $tile.AddArc(256 - $r, 0, $r, $r, 270, 90); $tile.AddArc(256 - $r, 256 - $r, $r, $r, 0, 90); $tile.AddArc(0, 256 - $r, $r, $r, 90, 90); $tile.CloseFigure()
  $g.FillPath((New-Object Drawing.SolidBrush $field), $tile)
  $mh = 150; $mw = $mh * $lightMark.Width / $lightMark.Height
  $g.DrawImage($lightMark, [single]((256 - $mw) / 2), [single]((256 - $mh) / 2), [single]$mw, [single]$mh)
  $g.Dispose()
  $png = New-Object IO.MemoryStream; $bmp.Save($png, [Drawing.Imaging.ImageFormat]::Png); $bytes = $png.ToArray(); $bmp.Dispose()
  $ico = New-Object IO.MemoryStream; $wr = New-Object IO.BinaryWriter $ico
  $wr.Write([uint16]0); $wr.Write([uint16]1); $wr.Write([uint16]1)
  $wr.Write([byte]0); $wr.Write([byte]0); $wr.Write([byte]0); $wr.Write([byte]0); $wr.Write([uint16]1); $wr.Write([uint16]32)
  $wr.Write([uint32]$bytes.Length); $wr.Write([uint32]22); $wr.Write($bytes); $wr.Flush()
  [IO.File]::WriteAllBytes($path, $ico.ToArray())
}

foreach ($s in @(@(164,314,100), @(192,386,125), @(246,459,150), @(273,556,175), @(328,604,200), @(355,645,225), @(410,797,250))) { Draw-Side $s[0] $s[1] (Join-Path $here ("side-{0}.bmp" -f $s[2])) }
foreach ($s in @(@(55,58,100), @(64,68,125), @(80,86,150), @(87,92,175), @(110,116,200), @(124,131,225), @(138,146,250))) { Draw-Head $s[0] $s[1] (Join-Path $here ("head-{0}.png" -f $s[2])) }
Draw-Icon (Join-Path $here "spotter.ico")
Get-ChildItem $here -Include *.bmp, *.png, *.ico -Recurse | ForEach-Object { "{0}  {1} bytes" -f $_.Name, $_.Length }
