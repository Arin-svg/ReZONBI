# Deterministic atlas packing only; artwork is generated with image_gen.
# Preserves .meta UUIDs. Source sheets and legacy assets live outside assets/.
param([ValidateSet('front','back','left','right')][string[]]$Directions = @('front','back','left','right'))
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
public static class SpriteBounds {
    public static Rectangle Find(Bitmap image, Rectangle cell) {
        int l=cell.Right,t=cell.Bottom,r=cell.Left-1,b=cell.Top-1;
        for(int y=cell.Top;y<cell.Bottom;y++)for(int x=cell.Left;x<cell.Right;x++) {
            if(image.GetPixel(x,y).A<115)continue;
            l=Math.Min(l,x);r=Math.Max(r,x);t=Math.Min(t,y);b=Math.Max(b,y);
        }
        if(r<l)throw new Exception("Empty sprite cell");
        return Rectangle.FromLTRB(l,t,r+1,b+1);
    }
}
"@
$measurements=@()
if ($Directions.Count -lt 4 -and (Test-Path output/rin-animation/measurements.json)) {
    $measurements=@((Get-Content output/rin-animation/measurements.json -Raw | ConvertFrom-Json) | Where-Object { $_.direction -notin $Directions })
}
foreach($direction in $Directions) {
    $source=[System.Drawing.Bitmap]::new((Join-Path $PWD "output/rin-animation/source/$direction.png"))
    $columns=if($direction -eq 'left'){@(0,421,797,1180,1536)}elseif($direction -eq 'right'){@(0,400,768,1152,1536)}else{@(0,384,768,1152,1536)}
    $bounds=@()
    for($frame=0;$frame -lt 8;$frame++) {
        $column=$frame%4; $row=[Math]::Floor($frame/4)
        $cell=[System.Drawing.Rectangle]::new($columns[$column],[int]($row*512),$columns[$column+1]-$columns[$column],512)
        $bounds+= [SpriteBounds]::Find($source,$cell)
    }
    $maxHeight=($bounds | Measure-Object Height -Maximum).Maximum
    $maxWidth=($bounds | Measure-Object Width -Maximum).Maximum
    $scale=[Math]::Min(336/$maxHeight,352/$maxWidth)
    $atlas=[System.Drawing.Bitmap]::new(3072,384)
    $atlasGraphics=[System.Drawing.Graphics]::FromImage($atlas)
    $atlasGraphics.Clear([System.Drawing.Color]::Transparent)
    for($frame=0;$frame -lt 8;$frame++) {
        $sprite=[System.Drawing.Bitmap]::new(384,384)
        $graphics=[System.Drawing.Graphics]::FromImage($sprite)
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $width=[int][Math]::Round($bounds[$frame].Width*$scale)
        $height=[int][Math]::Round($bounds[$frame].Height*$scale)
        $target=[System.Drawing.Rectangle]::new([int][Math]::Floor((384-$width)/2),360-$height,$width,$height)
        $graphics.DrawImage($source,$target,$bounds[$frame],[System.Drawing.GraphicsUnit]::Pixel)
        # The first right-facing pose extends its toe beyond the nominal cell.
        # Its upper-right strip belongs to the NEXT pose's hair, not this frame.
        if ($direction -eq 'right' -and $frame%4 -eq 0) {
            $cutX=$target.X+(384-$bounds[$frame].X)*$scale
            $cutBottom=$target.Y+(([Math]::Floor($frame/4)*512+350)-$bounds[$frame].Y)*$scale
            $clear=[System.Drawing.SolidBrush]::new([System.Drawing.Color]::Transparent)
            $graphics.FillRectangle($clear,[single]$cutX,[single]0,[single](384-$cutX),[single]$cutBottom)
            $clear.Dispose()
        }
        $graphics.Dispose()
        $path=Join-Path $PWD ('assets/art/characters/rin/run/run_{0}_{1:00}.png' -f $direction,$frame)
        $sprite.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
        $atlasGraphics.DrawImageUnscaled($sprite,$frame*384,0)
        $actual=[SpriteBounds]::Find($sprite,[System.Drawing.Rectangle]::new(0,0,384,384))
        $measurements+=@{direction=$direction;frame=$frame;source=@($bounds[$frame].X,$bounds[$frame].Y,$bounds[$frame].Width,$bounds[$frame].Height);bounds=@($actual.X,$actual.Y,$actual.Width,$actual.Height);foot=$actual.Bottom}
        $sprite.Dispose()
    }
    $atlasGraphics.Dispose()
    $atlas.Save((Join-Path $PWD "assets/art/characters/rin/rin-run-$direction-atlas.png"),[System.Drawing.Imaging.ImageFormat]::Png)
    $atlas.Dispose();$source.Dispose()
}
$measurements | ConvertTo-Json -Depth 4 | Set-Content output/rin-animation/measurements.json
$measurements | ForEach-Object { '{0} {1}: height={2} foot={3}' -f $_.direction,$_.frame,$_.bounds[3],$_.foot }
