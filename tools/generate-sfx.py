"""Deterministic original effects. Never overwrite existing audio assets."""
import math, random, struct, wave
from pathlib import Path

RATE = 44100
ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'audio'
# name: duration, base frequency, frequency sweep, noise amount, decay, recipe
RECIPES = {
 'gunshot':(.25,140,-95,.85,19,'impact'),
 'bullet_impact':(.16,270,-180,.8,24,'impact'),
 'reload':(.5,850,-300,.65,8,'clicks'),
 'melee_slash':(.28,800,-650,.8,9,'whoosh'),
 'electric_pulse':(.7,180,1100,.25,5,'electric'),
 'bloodlust':(1.2,65,110,.25,3,'energy'),
 'zombie_groan':(1.5,85,-28,.28,2,'voice'),
 'zombie_attack':(.55,130,-70,.45,5,'voice'),
 'zombie_hit':(.2,100,-65,.75,18,'impact'),
 'zombie_death':(1,100,-65,.5,4,'voice'),
 'rin_hurt':(.3,390,-130,.12,10,'voice'),
 'dodge':(.3,950,-800,.7,7,'whoosh'),
 'rin_death':(1.4,330,-230,.15,3,'energy'),
 'exp_pickup':(.18,950,550,.03,15,'tone'),
 'upgrade_selected':(.55,520,400,.03,5,'chord'),
 'level_up':(1.1,330,1000,.03,3,'chord'),
 'ui_click':(.09,1100,-400,.12,35,'tone'),
 'ui_confirm':(.24,660,330,.02,12,'chord'),
 'ui_back':(.18,550,-220,.02,14,'tone'),
 'pause':(.3,660,-330,.03,10,'tone'),
 'boss_spawn':(1.8,60,110,.35,2,'energy'),
 'boss_attack':(.65,90,-60,.7,7,'impact'),
 'boss_phase':(1.2,120,450,.3,3,'electric'),
 'boss_defeat':(1.8,170,-130,.65,3,'energy'),
 'horde_warning':(.9,220,100,.08,3,'alarm'),
 'low_hp':(.6,330,-40,.02,3,'alarm'),
 'high_noise':(.7,700,-200,.07,4,'alarm'),
}

def synth(name, spec):
    duration, base, sweep, noise_mix, decay, kind = spec
    rng = random.Random(name)
    samples, filtered, smooth, phase = [], 0., 0., 0.
    for i in range(round(duration*RATE)):
        t=i/RATE; u=t/duration
        frequency=max(30,base+sweep*u)
        if kind=='chord': frequency=base*[1,1.25,1.5,2][min(3,int(u*4))]
        phase+=2*math.pi*frequency/RATE
        filtered+=.19*(rng.uniform(-1,1)-filtered)
        tone=math.sin(phase)+.25*math.sin(phase*2)+.1*math.sin(phase*3)
        if kind=='voice': tone=math.tanh(tone*2)*( .65+.35*math.sin(2*math.pi*24*t))
        if kind=='electric': tone=math.sin(phase+3*math.sin(phase*.51))
        if kind=='energy': tone+=.5*math.sin(phase*.5)
        envelope=min(1,t/.008)*math.exp(-decay*t)*(min(1,(duration-t)/.045))
        if kind=='whoosh': envelope=math.sin(math.pi*u)**1.5
        if kind in ('clicks','alarm'): envelope*=max(0,math.sin(2*math.pi*(7 if kind=='clicks' else 4)*t))**3
        value=math.tanh((tone*(1-noise_mix)+filtered*noise_mix*3)*1.4)*envelope
        smooth+=.32*(value-smooth) # tame high frequencies
        samples.append(smooth)
    peak=max(abs(s) for s in samples) or 1
    return b''.join(struct.pack('<h',round(s/peak*.78*32767)) for s in samples)

if __name__=='__main__':
    out=ROOT/'sfx';out.mkdir(parents=True,exist_ok=True)
    made=0
    for name,spec in RECIPES.items():
        target=out/(name+'.wav')
        if target.exists():continue
        with wave.open(str(target),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(synth(name,spec))
        made+=1
    for name in RECIPES:
        with wave.open(str(out/(name+'.wav')),'rb') as f:
            assert f.getnchannels()==1 and f.getsampwidth()==2 and f.getframerate()==RATE
            data=f.readframes(f.getnframes());values=struct.unpack('<'+'h'*(len(data)//2),data)
            assert len(values)>2000 and 0<max(abs(v) for v in values)<32767
    print(f'Generated {made}; verified {len(RECIPES)} mono PCM16 WAV files.')
