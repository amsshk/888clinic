"""
MALI — train the 3-class ISIC 2017 lesion classifier.

Transfer learning on an ImageNet backbone, class-weighted loss for the melanoma
imbalance, light augmentation. Emits:

  runs/<tag>/best.pt          best-validation checkpoint
  runs/<tag>/mali.onnx        exported model for the inference service
  runs/<tag>/predictions.csv  600-row submission scored by get_results.py

Requires a GPU host. This does NOT run in the Lovable sandbox or the app runtime.

    python -m venv .venv && source .venv/bin/activate
    pip install torch torchvision pandas onnx
    python train.py --data data --epochs 15 --tag effb0-run1
    python get_results.py runs/effb0-run1/predictions.csv
"""

from __future__ import annotations

import argparse
import csv
import os

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

CLASSES = ["melanoma", "nevus", "seborrheic_keratosis"]
IMG = 224
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


def loaders(root: str, batch: int):
    train_tf = transforms.Compose(
        [
            transforms.RandomResizedCrop(IMG, scale=(0.7, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.RandomRotation(20),
            transforms.ColorJitter(0.2, 0.2, 0.2, 0.05),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )
    eval_tf = transforms.Compose(
        [
            transforms.Resize(int(IMG * 1.14)),
            transforms.CenterCrop(IMG),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )

    sets = {
        split: datasets.ImageFolder(os.path.join(root, split), train_tf if split == "train" else eval_tf)
        for split in ("train", "valid", "test")
    }
    for name, ds in sets.items():
        if ds.classes != CLASSES:
            raise SystemExit(f"{name}/ must contain exactly these folders: {CLASSES} (found {ds.classes})")

    return (
        DataLoader(sets["train"], batch_size=batch, shuffle=True, num_workers=4, pin_memory=True),
        DataLoader(sets["valid"], batch_size=batch, num_workers=4),
        DataLoader(sets["test"], batch_size=batch, num_workers=4),
        sets["test"],
        sets["train"],
    )


def build_model(arch: str) -> nn.Module:
    if arch == "efficientnet_b0":
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(CLASSES))
    elif arch == "resnet50":
        model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        model.fc = nn.Linear(model.fc.in_features, len(CLASSES))
    else:
        raise SystemExit(f"unknown arch {arch}")
    return model


def class_weights(train_set, device) -> torch.Tensor:
    counts = [0] * len(CLASSES)
    for _, label in train_set.samples:
        counts[label] += 1
    total = sum(counts)
    weights = [total / (len(CLASSES) * max(1, c)) for c in counts]
    print("class counts", dict(zip(CLASSES, counts)), "weights", weights)
    return torch.tensor(weights, dtype=torch.float, device=device)


@torch.no_grad()
def evaluate(model, loader, device) -> float:
    model.eval()
    correct = seen = 0
    for x, y in loader:
        pred = model(x.to(device)).argmax(1).cpu()
        correct += (pred == y).sum().item()
        seen += y.numel()
    return correct / max(1, seen)


@torch.no_grad()
def write_predictions(model, loader, test_set, device, path: str) -> None:
    """task_1 = P(melanoma), task_2 = P(seborrheic keratosis) — get_results.py's contract."""
    model.eval()
    probs = []
    for x, _ in loader:
        probs.append(torch.softmax(model(x.to(device)), dim=1).cpu())
    probs = torch.cat(probs)

    ids = [os.path.splitext(os.path.basename(p))[0] for p, _ in test_set.samples]
    with open(path, "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["Id", "task_1", "task_2"])
        for name, row in zip(ids, probs.tolist()):
            writer.writerow([name, f"{row[0]:.6f}", f"{row[2]:.6f}"])
    print("wrote", path, len(ids), "rows")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    ap.add_argument("--arch", default="efficientnet_b0", choices=["efficientnet_b0", "resnet50"])
    ap.add_argument("--epochs", type=int, default=15)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--tag", default="run1")
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        print("WARNING: no GPU detected — training will be extremely slow.")

    out = os.path.join("runs", args.tag)
    os.makedirs(out, exist_ok=True)

    train_loader, valid_loader, test_loader, test_set, train_set = loaders(args.data, args.batch)
    model = build_model(args.arch).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights(train_set, device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best = 0.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        running = 0.0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()
            running += loss.item() * y.numel()
        scheduler.step()

        acc = evaluate(model, valid_loader, device)
        print(f"epoch {epoch:02d}  loss {running / len(train_set):.4f}  valid_acc {acc:.4f}")
        if acc > best:
            best = acc
            torch.save(model.state_dict(), os.path.join(out, "best.pt"))
            print("  saved new best")

    model.load_state_dict(torch.load(os.path.join(out, "best.pt"), map_location=device))
    write_predictions(model, test_loader, test_set, device, os.path.join(out, "predictions.csv"))

    dummy = torch.randn(1, 3, IMG, IMG, device=device)
    torch.onnx.export(
        model,
        dummy,
        os.path.join(out, "mali.onnx"),
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )
    print("exported", os.path.join(out, "mali.onnx"))
    print("\nNow score it:  python get_results.py", os.path.join(out, "predictions.csv"))
    print("Gate: only ship a model whose Category 3 mean AUC clears ~0.85.")


if __name__ == "__main__":
    main()
